import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  Linking,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

type Tab = 'Inicio' | 'Stock' | 'Ventas' | 'Caja' | 'Clientes' | 'Facturas' | 'Usuarios';
type AnyRecord = Record<string, any>;
const TABS: Tab[] = ['Inicio', 'Stock', 'Ventas', 'Caja', 'Clientes', 'Facturas', 'Usuarios'];
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const expoLanHost = expoHost && (/^(10|192\.168)\./.test(expoHost) || /^172\.(1[6-9]|2\d|3[01])\./.test(expoHost))
  ? expoHost
  : undefined;
const DEFAULT_API = process.env.EXPO_PUBLIC_API_URL || (expoLanHost ? `http://${expoLanHost}:3010` : 'http://localhost:3010');
const TOKEN_KEY = 'pintame_access_token';
const API_KEY = 'pintame_api_url';
const CART_KEY = 'pintame_sale_cart_v1';
const THEME_KEY = 'pintame_theme_v1';
const PAGE_SIZE = 8;
type CartLine = { product: AnyRecord; quantity: number };
// Packshots of the Sinteplast products loaded into the local sample catalog.
const PRODUCT_IMAGES: Record<string, string> = {
  'PNT-LAT-INT-20L': 'https://images.fravega.com/f1000/98a44037fbe5721048d875d7a8529c31.jpg',
  'PNT-LAT-EXT-20L': 'https://cdn11.bigcommerce.com/s-ftsflnse4o/images/stencil/608x608/products/2635691/10657971/D_787212-MLA74601397639_022024-O__47453.1735112897.jpg?c=1',
  'PNT-ESM-BLA-1L': 'https://masonlineprod.vtexassets.com/arquivos/ids/241299/0779295201265-01-28549.jpg?v=637867896862100000',
  'PNT-IMPER-20K': 'https://dcdn-us.mitiendanube.com/stores/003/598/064/products/fibrado-20k-dc29163cb009ec8eca17363444104599-640-0.png',
  'PNT-END-INT-20K': 'https://cdn11.bigcommerce.com/s-ftsflnse4o/images/stencil/590x590/products/1840368/7420654/D_725996-MLA53600446426_022023-O__33267.1733406368.jpg?c=1',
  'PNT-ROD-22': 'https://martel.com.ar/storage/2023/09/Sinteplast-600x600.jpg',
  'PNT-PINC-2': 'https://f.fcdn.app/imgs/1a4466/www.urucolor.com.py/urorpy/6cf0/original/catalogo/6211pin_6211pin_2/1500-1500/pincel-sinteplast-serie-300-pincel-sinteplast-serie-300.jpg',
  'PNT-FIJ-4L': 'https://colorprix.com.ar/uploads/0/productos/s/200116.jpg',
};
const money = (value: unknown) => `$ ${Number(value ?? 0).toLocaleString('es-AR')}`;
const nameOf = (x: AnyRecord) => x.nombreCompleto || [x.nombre, x.apellido].filter(Boolean).join(' ') || x.nombre || x.codigo || `#${x.id}`;
const navLabels: Record<Tab, string> = { Inicio: 'Punto de venta', Stock: 'Productos', Ventas: 'Historial', Caja: 'Movimientos', Clientes: 'Clientes', Facturas: 'Facturas', Usuarios: 'Cajeros' };
const dateOf = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('es-AR') : '—';
const stockLevel = (value: unknown) => {
  const quantity = Number(value ?? 0);
  if (quantity <= 0) return { label: 'SIN STOCK', tone: 'red' as const };
  if (quantity < 5) return { label: 'CRÍTICO', tone: 'red' as const };
  if (quantity <= 15) return { label: 'STOCK BAJO', tone: 'yellow' as const };
  return { label: 'DISPONIBLE', tone: 'green' as const };
};
const productMark = (product: AnyRecord) => {
  const text = `${product?.nombre ?? ''} ${product?.descripcion ?? ''}`.toLocaleLowerCase('es-AR');
  if (/rodillo|pincel|brocha|lija|esp[aá]tula/.test(text)) return '🖌️';
  if (/impermeab|membrana|humedad/.test(text)) return '💧';
  if (/enduido|masilla|reparador|cemento/.test(text)) return '🧱';
  if (/fijador|sellador|aguarr[aá]s|thinner|diluyente/.test(text)) return '🧴';
  if (/pintura|l[aá]tex|esmalte|barniz/.test(text)) return '🎨';
  return '📦';
};
const imageForProduct = (product: AnyRecord) => product?.imagenUrl || PRODUCT_IMAGES[product?.codigo] || '';

async function readStoredItem(key: string) {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeStoredItem(key: string, value: string) {
  if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value);
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
}

async function deleteStoredItem(key: string) {
  if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
  if (typeof window !== 'undefined') window.localStorage.removeItem(key);
}

export default function App() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 820;
  const [apiUrl, setApiUrl] = useState(DEFAULT_API);
  const [themeMode, setThemeMode] = useState<'claro' | 'oscuro'>('claro');
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('Inicio');
  const [data, setData] = useState<AnyRecord[]>([]);
  const [catalog, setCatalog] = useState<AnyRecord[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartRestored, setCartRestored] = useState(false);
  const [caja, setCaja] = useState<AnyRecord | null>(null);
  const [cashHistory, setCashHistory] = useState<AnyRecord[]>([]);
  const [cashSearch, setCashSearch] = useState('');
  const [openingCashAmount, setOpeningCashAmount] = useState('0');
  const [profile, setProfile] = useState<AnyRecord | null>(null);
  const [cashiers, setCashiers] = useState<AnyRecord[]>([]);
  const [selectedCashier, setSelectedCashier] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({ email: '', nombre: '', password: '', rol: 'CAJERO' as 'ADMIN' | 'CAJERO' });
  const [menuOpen, setMenuOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerPurpose, setScannerPurpose] = useState<'sale' | 'product'>('sale');
  const [productLocation, setProductLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saleLocation, setSaleLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [clientName, setClientName] = useState('Consumidor Final');
  const [clientForm, setClientForm] = useState({ dni: '', nombre: '', apellido: '', email: '', telefono: '', direccion: '' });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [productForm, setProductForm] = useState({ codigo: '', nombre: '', descripcion: '', imagenUrl: '', precioCosto: '', precioVenta: '', stockInicial: '0', stockMinimo: '0' });
  const screenTransition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    screenTransition.setValue(0);
    Animated.spring(screenTransition, { toValue: 1, damping: 20, stiffness: 170, mass: 0.8, useNativeDriver: true }).start();
  }, [tab, screenTransition]);

  useEffect(() => {
    (async () => {
      const savedApi = await readStoredItem(API_KEY);
      const savedToken = await readStoredItem(TOKEN_KEY);
      const savedCart = await readStoredItem(CART_KEY);
      const savedTheme = await readStoredItem(THEME_KEY);
      if (savedTheme === 'oscuro') {
        colors = DARK_COLORS;
        styles = createStyles();
        setThemeMode('oscuro');
      }
      if (savedApi) {
        const savedLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(savedApi);
        setApiUrl(savedLocalhost && Platform.OS !== 'web' ? DEFAULT_API : savedApi);
      }
      if (savedToken) setToken(savedToken);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed.filter(line => line?.product?.id && Number(line.quantity) > 0));
      }
    })().catch(() => undefined).finally(() => setCartRestored(true));
  }, []);

  useEffect(() => {
    if (!cartRestored) return;
    void writeStoredItem(CART_KEY, JSON.stringify(cart)).catch(() => undefined);
  }, [cart, cartRestored]);

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    const root = apiUrl.trim().replace(/\/$/, '');
    const response = await fetch(`${root}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body?.message || `Error ${response.status}`;
      if (response.status === 401) {
        await deleteStoredItem(TOKEN_KEY);
        setToken(null);
      }
      throw new Error(Array.isArray(message) ? message.join(', ') : message);
    }
    return body;
  }, [apiUrl, token]);

  const load = useCallback(async (activeTab: Tab = tab) => {
    if (!token) return;
    setError('');
    try {
      if (activeTab === 'Inicio') {
        const [me, openCash, products, sales] = await Promise.all([
          request('/auth/perfil'), request('/caja/abierta'), request('/stock/productos'), request('/ventas'),
        ]);
        setProfile(me);
        setCaja(openCash);
        setCatalog(products || []);
        setData([{ _kind: 'summary', products: products?.length ?? 0, pending: (sales || []).filter((s: AnyRecord) => s.estado === 'PENDIENTE').length }]);
      } else if (activeTab === 'Stock') { const products = await request('/stock/productos') || []; setCatalog(products); setData(products); }
      else if (activeTab === 'Ventas') {
        const salesPath = profile?.rol === 'ADMIN' && selectedCashier ? `/ventas?cajeroId=${encodeURIComponent(selectedCashier)}` : '/ventas';
        const [sales, products] = await Promise.all([request(salesPath), request('/stock/productos')]);
        setCatalog(products || []); setData(sales || []);
        if (profile?.rol === 'ADMIN') setCashiers((await request('/users') || []).filter((user: AnyRecord) => user.rol === 'CAJERO'));
      }
      else if (activeTab === 'Usuarios' && profile?.rol === 'ADMIN') setData(await request('/users') || []);
      else if (activeTab === 'Clientes') setData(await request('/clientes') || []);
      else if (activeTab === 'Facturas') setData(await request('/facturas') || []);
      else {
        let openCash: AnyRecord | null = null;
        try { openCash = await request('/caja/abierta'); }
        catch (e) {
          const message = e instanceof Error ? e.message.toLocaleLowerCase('es-AR') : '';
          if (!message.includes('caja abierta')) throw e;
        }
        setCaja(openCash);
        if (profile?.rol === 'ADMIN') setCashHistory(await request('/caja/historial') || []);
        setData(openCash?.id ? await request(`/caja/${openCash.id}/movimientos`) || [] : []);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo conectar con el servidor.';
      if (activeTab === 'Caja' && message.toLocaleLowerCase('es-AR').includes('caja abierta')) {
        setCaja(null);
        setData([]);
        setError('');
      } else setError(message);
    }
  }, [request, tab, token, profile?.rol, selectedCashier]);

  const refreshCurrentTab = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await load(tab); }
    finally { setRefreshing(false); }
  };

  const openProductLocation = (product: AnyRecord) => {
    const latitude = Number(product.ubicacionLatitud);
    const longitude = Number(product.ubicacionLongitud);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`).catch(() => {
      setError('No se pudo abrir el mapa en este dispositivo.');
    });
  };

  useEffect(() => { if (token) void load(tab); }, [token, tab, load]);

  const login = async () => {
    setBusy(true); setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const root = apiUrl.trim().replace(/\/$/, '');
      const response = await fetch(`${root}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || `Error ${response.status}`);
      await writeStoredItem(TOKEN_KEY, body.accessToken);
      await writeStoredItem(API_KEY, root);
      setToken(body.accessToken); setPassword('');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setError('El servidor tardó más de 20 segundos. Revisá que API Gateway y Auth estén iniciados y que el teléfono use la misma Wi-Fi que la PC.');
      } else {
        setError(e instanceof Error ? `${e.message}. Verificá la IP del servidor y la conexión Wi-Fi.` : 'No se pudo conectar con el servidor.');
      }
    }
    finally { clearTimeout(timeout); setBusy(false); }
  };

  const signOut = async () => {
    await deleteStoredItem(TOKEN_KEY);
    await deleteStoredItem(CART_KEY).catch(() => undefined);
    setToken(null); setData([]); setCatalog([]); setCart([]); setCashHistory([]); setCaja(null); setProfile(null); setTab('Inicio');
  };

  const addToCart = (product: AnyRecord) => {
    const available = Number(product.stockActual ?? 0);
    const current = cart.find(line => Number(line.product.id) === Number(product.id))?.quantity ?? 0;
    if (current >= available) { setError(available <= 0 ? 'Este producto no tiene unidades disponibles.' : 'No podés agregar más unidades que las disponibles.'); return; }
    setError('');
    setCart(lines => {
      const found = lines.find(line => Number(line.product.id) === Number(product.id));
      return found
        ? lines.map(line => Number(line.product.id) === Number(product.id) ? { ...line, quantity: line.quantity + 1 } : line)
        : [...lines, { product, quantity: 1 }];
    });
  };

  const toggleTheme = () => {
    const next = themeMode === 'claro' ? 'oscuro' : 'claro';
    colors = next === 'oscuro' ? DARK_COLORS : LIGHT_COLORS;
    styles = createStyles();
    setThemeMode(next);
    void writeStoredItem(THEME_KEY, next).catch(() => undefined);
  };

  const changeCartQuantity = (productId: number, delta: number) => setCart(lines => lines
    .map(line => Number(line.product.id) === productId ? { ...line, quantity: Math.min(Number(line.product.stockActual ?? 0), line.quantity + delta) } : line)
    .filter(line => line.quantity > 0));
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + Number(line.product.precioVenta ?? 0) * line.quantity, 0);
  const cashSummary = useMemo(() => {
    const opening = Number(caja?.montoInicial ?? 0);
    const sales = data.filter(move => move.tipo === 'VENTA').reduce((sum, move) => sum + Number(move.monto ?? 0), 0);
    const income = data.filter(move => move.tipo === 'INGRESO' || move.tipo === 'VENTA').reduce((sum, move) => sum + Number(move.monto ?? 0), 0);
    const outgoing = data.filter(move => move.tipo === 'RETIRO' || move.tipo === 'GASTO').reduce((sum, move) => sum + Number(move.monto ?? 0), 0);
    return { sales, expected: opening + income - outgoing };
  }, [caja, data]);
  const filteredCashHistory = useMemo(() => {
    const term = cashSearch.trim().toLocaleLowerCase('es-AR');
    if (!term) return cashHistory;
    return cashHistory.filter(box => [box.id, box.estado, box.usuarioAperturaNombre, box.usuarioCierreNombre, box.observacion, dateOf(box.fechaApertura), dateOf(box.fechaCierre)].filter(Boolean).join(' ').toLocaleLowerCase('es-AR').includes(term));
  }, [cashHistory, cashSearch]);

  const action = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true); setError('');
    try { await fn(); if (success) Alert.alert('Listo', success); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar la operación.'); }
    finally { setBusy(false); }
  };

  const openCash = async () => {
    const amount = Number(openingCashAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) { setError('Ingresá un fondo inicial válido, igual o mayor que cero.'); return; }
    setBusy(true); setError('');
    try {
      await request('/caja/abrir', { method: 'POST', body: JSON.stringify({ montoInicial: amount }) });
      setOpeningCashAmount('0');
      await load('Caja');
      Alert.alert('Caja abierta', 'Ya podés registrar ventas y movimientos.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir la caja.'); }
    finally { setBusy(false); }
  };

  const confirmCloseCash = () => {
    if (profile?.rol !== 'ADMIN' || caja?.estado !== 'ABIERTA') return;
    Alert.alert(
      'Cerrar caja',
      `Ventas cobradas: ${money(cashSummary.sales)}\nEfectivo esperado (incluye fondo inicial): ${money(cashSummary.expected)}\n\n¿Confirmás el cierre?`,
      [
        { text: 'Seguir trabajando', style: 'cancel' },
        { text: 'Cerrar caja', style: 'destructive', onPress: () => { void (async () => {
          setBusy(true); setError('');
          try {
            const closed = await request('/caja/cerrar', { method: 'POST', body: JSON.stringify({ observacion: 'Cierre desde la app móvil' }) });
            setCaja(closed);
            if (closed?.id) setData(await request(`/caja/${closed.id}/movimientos`) || []);
            setCashHistory(await request('/caja/historial') || []);
            Alert.alert('Caja cerrada', `Monto final registrado: ${money(closed?.montoFinal ?? cashSummary.expected)}.`);
          } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja.'); }
          finally { setBusy(false); }
        })(); } },
      ],
    );
  };

  const viewCashbox = async (box: AnyRecord) => {
    setBusy(true); setError('');
    try {
      const [details, movements] = await Promise.all([request(`/caja/${box.id}`), request(`/caja/${box.id}/movimientos`)]);
      setCaja(details);
      setData(movements || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar esa caja.'); }
    finally { setBusy(false); }
  };

  const createSale = async () => {
    if (!cart.length) { setError('Agregá al menos un producto al carrito.'); return; }
    await action(async () => {
      await request('/ventas', { method: 'POST', body: JSON.stringify({
        detalles: cart.map(line => ({ productoId: Number(line.product.id), cantidad: line.quantity })),
        ...(saleLocation ? { ubicacionLatitud: saleLocation.latitude, ubicacionLongitud: saleLocation.longitude } : {}),
      }) });
      setCart([]);
      setSaleLocation(null);
    }, 'Venta creada como pendiente.');
  };

  const captureSaleLocation = async () => {
    setLocationBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Necesitamos permiso de ubicación para adjuntarla a esta venta.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setSaleLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener la ubicación.');
    } finally {
      setLocationBusy(false);
    }
  };

  const captureProductLocation = async () => {
    setLocationBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Se negó el permiso de ubicación. Podés guardar el producto sin ubicación.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setProductLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener la ubicación.');
    } finally {
      setLocationBusy(false);
    }
  };

  const handleBarcodeScan = (result: BarcodeScanningResult) => {
    setScannerOpen(false);
    const code = result.data.trim().toLocaleUpperCase('es-AR');
    if (scannerPurpose === 'product') {
      setProductForm(current => ({ ...current, codigo: result.data.trim() }));
      setScannerPurpose('sale');
      return;
    }
    const product = catalog.find(item => String(item.codigo ?? '').trim().toLocaleUpperCase('es-AR') === code);
    if (!product) {
      setError(`No encontramos el código ${result.data}. Verificá que esté cargado como código del producto.`);
      return;
    }
    addToCart(product);
    setTab('Inicio');
  };

  const createClient = async () => {
    const dni = clientForm.dni.trim();
    const nombre = clientForm.nombre.trim();
    const apellido = clientForm.apellido.trim();
    if (dni.length < 7 || dni.length > 20 || nombre.length < 2 || apellido.length < 2) {
      setError('Completá DNI, nombre y apellido. El DNI debe tener entre 7 y 20 caracteres.');
      return;
    }
    const body = {
      dni, nombre, apellido,
      ...(clientForm.email.trim() ? { email: clientForm.email.trim() } : {}),
      ...(clientForm.telefono.trim() ? { telefono: clientForm.telefono.trim() } : {}),
      ...(clientForm.direccion.trim() ? { direccion: clientForm.direccion.trim() } : {}),
    };
    await action(async () => {
      await request('/clientes', { method: 'POST', body: JSON.stringify(body) });
      setClientForm({ dni: '', nombre: '', apellido: '', email: '', telefono: '', direccion: '' });
    }, 'Cliente creado.');
  };

  const createProduct = async () => {
    const costo = Number(productForm.precioCosto);
    const venta = Number(productForm.precioVenta);
    const stockMinimo = Number(productForm.stockMinimo || 0);
    const stockInicial = Number(productForm.stockInicial || 0);
    if (!productForm.codigo.trim() || !productForm.nombre.trim() || !Number.isFinite(costo) || !Number.isFinite(venta) || costo < 0 || venta <= 0 || !Number.isFinite(stockMinimo) || stockMinimo < 0 || !Number.isFinite(stockInicial) || stockInicial < 0) {
      setError('Completá código, nombre y precios válidos. Los stocks no pueden ser negativos.');
      return;
    }
    const body = {
      codigo: productForm.codigo.trim(), nombre: productForm.nombre.trim(), precioCosto: costo, precioVenta: venta,
      stockMinimo, ...(!editingProductId ? { stockInicial } : {}), descripcion: productForm.descripcion.trim() || null, imagenUrl: productForm.imagenUrl.trim(),
      ...(!editingProductId && productLocation ? { ubicacionLatitud: productLocation.latitude, ubicacionLongitud: productLocation.longitude } : {}),
    };
    await action(async () => {
      await request(editingProductId ? `/stock/productos/${editingProductId}` : '/stock/productos', { method: editingProductId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setProductForm({ codigo: '', nombre: '', descripcion: '', imagenUrl: '', precioCosto: '', precioVenta: '', stockInicial: '0', stockMinimo: '0' });
      setEditingProductId(null);
      setProductLocation(null);
      setProductModalOpen(false);
    }, editingProductId ? 'Producto actualizado.' : 'Producto creado con el stock inicial indicado.');
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setProductLocation(null);
    setProductForm({ codigo: '', nombre: '', descripcion: '', imagenUrl: '', precioCosto: '', precioVenta: '', stockInicial: '0', stockMinimo: '0' });
    setError('');
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
    setEditingProductId(null);
    setProductLocation(null);
    setError('');
  };

  const startProductEdit = (product: AnyRecord) => {
    setEditingProductId(Number(product.id));
    setProductForm({ codigo: product.codigo || '', nombre: product.nombre || '', descripcion: product.descripcion || '', imagenUrl: product.imagenUrl || '', precioCosto: String(product.precioCosto ?? ''), precioVenta: String(product.precioVenta ?? ''), stockInicial: '0', stockMinimo: String(product.stockMinimo ?? '0') });
    setProductLocation(null);
    setProductModalOpen(true);
    setError('');
  };

  const saveUser = async () => {
    const nombre = userForm.nombre.trim();
    if (!nombre || nombre.length > 150 || (!editingUserId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.trim())) || (!editingUserId && userForm.password.length < 8) || (userForm.password && userForm.password.length < 8)) {
      setError('Completá un nombre válido, email para crear y contraseña de al menos 8 caracteres.');
      return;
    }
    const body = editingUserId
      ? { nombre, rol: userForm.rol, ...(userForm.password ? { password: userForm.password } : {}) }
      : { nombre, email: userForm.email.trim(), password: userForm.password, rol: 'CAJERO' as const };
    await action(async () => {
      await request(editingUserId ? `/users/${editingUserId}` : '/users', { method: editingUserId ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setEditingUserId(null);
      setUserForm({ email: '', nombre: '', password: '', rol: 'CAJERO' });
    }, editingUserId ? 'Usuario actualizado.' : 'Cajero creado.');
  };

  const startUserEdit = (user: AnyRecord) => {
    setEditingUserId(Number(user.id));
    setUserForm({ email: user.email, nombre: user.nombre, password: '', rol: user.rol });
    setError('');
  };

  const toggleUserActive = (user: AnyRecord) => void action(
    () => request(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !user.activo }) }),
    user.activo ? 'Cajero desactivado.' : 'Cajero activado.',
  );

  const title = useMemo(() => tab === 'Inicio' ? 'Punto de venta' : navLabels[tab], [tab]);
  const visibleTabs = profile?.rol === 'ADMIN' ? TABS : TABS.filter(item => item !== 'Usuarios');
  const filteredData = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es-AR');
    if (!normalized) return data;
    const searchable = (item: AnyRecord) => {
      if (tab === 'Stock') return [item.codigo, item.nombre, item.descripcion].filter(Boolean).join(' ');
      if (tab === 'Ventas') return [item.numero, item.estado, item.observacion, ...(item.detalles || []).flatMap((line: AnyRecord) => [line.descripcion, line.productoId])].filter(Boolean).join(' ');
      if (tab === 'Clientes') return [item.dni, item.nombre, item.apellido, item.email, item.telefono].filter(Boolean).join(' ');
      if (tab === 'Caja') return [item.tipo, item.descripcion, item.referencia].filter(Boolean).join(' ');
      return [item.numero, item.clienteNombre, item.estado, item.ventaId].filter(Boolean).join(' ');
    };
    return data.filter(item => searchable(item).toLocaleLowerCase('es-AR').includes(normalized));
  }, [data, query, tab]);
  const pageCount = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const pageData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [tab, query]);
  if (!token) return <LoginScreen apiUrl={apiUrl} setApiUrl={setApiUrl} email={email} setEmail={setEmail} password={password} setPassword={setPassword} busy={busy} error={error} themeMode={themeMode} onToggleTheme={toggleTheme} onLogin={login} />;

  return (
    <SafeAreaView style={[styles.safe, desktop && styles.desktopSafe]}>
      <StatusBar style={themeMode === 'oscuro' ? 'light' : 'dark'} />
      {desktop ? (
        <View style={styles.desktopLayout}>
          <View style={styles.sidebar}>
            <View style={styles.sidebarBrand}><Image source={require('../../assets/pintame-logo.png')} style={styles.sidebarLogo} resizeMode="contain" accessibilityLabel="Pintame Pinturería" /></View>
            <Text style={styles.sideSection}>GESTIÓN</Text>
            {visibleTabs.map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.sideLink, tab === item && styles.sideLinkActive]}><Text style={[styles.sideIcon, tab === item && styles.sideIconActive]}>{({ Inicio: '▦', Stock: '▤', Ventas: '↻', Caja: '◷', Clientes: '♙', Facturas: '▧', Usuarios: '♟' } as Record<Tab, string>)[item]}</Text><Text style={[styles.sideText, tab === item && styles.sideTextActive]}>{navLabels[item]}</Text></Pressable>)}
            <View style={styles.sideSpacer} />
            <Pressable onPress={toggleTheme} style={styles.sideLink}><Text style={styles.sideIcon}>{themeMode === 'oscuro' ? '☀' : '☾'}</Text><Text style={styles.sideText}>{themeMode === 'oscuro' ? 'Modo claro' : 'Modo oscuro'}</Text></Pressable>
            <Pressable onPress={signOut} style={styles.sideLink}><Text style={styles.sideIcon}>⚙</Text><Text style={styles.sideText}>Salir de la cuenta</Text></Pressable>
            <Text style={styles.sideUser}>{profile?.nombre || profile?.email || 'Usuario'}</Text>
          </View>
          <View style={styles.desktopMain}>
            <View style={styles.desktopHeader}><Text style={styles.welcome}>¡Bienvenido! {profile?.nombre || 'a Pintame'}</Text><View style={styles.headerActions}><CartButton count={cartCount} total={cartTotal} onPress={() => setTab('Ventas')} /><Text style={styles.headerDate}>{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text></View></View>
            <Animated.ScrollView style={[styles.desktopBody, { opacity: screenTransition, transform: [{ translateY: screenTransition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]} contentContainerStyle={styles.desktopContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCurrentTab} tintColor={colors.accent} />}>
              <View style={styles.pageHeading}><View><Text style={styles.pageTitle}>{title}</Text><Text style={styles.subtitle}>{tab === 'Stock' ? 'Controlá productos y disponibilidad.' : tab === 'Ventas' ? 'Consultá y gestioná tus ventas.' : tab === 'Clientes' ? 'Tu cartera de clientes.' : tab === 'Facturas' ? 'Comprobantes internos clase B.' : tab === 'Caja' ? 'Resumen y movimientos de caja.' : 'Administrá el negocio desde un solo lugar.'}</Text></View><Pressable disabled={refreshing} onPress={() => void refreshCurrentTab()} style={styles.refreshButton}>{refreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.refreshText}>↻  Actualizar</Text>}</Pressable></View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {tab === 'Inicio' ? <><Dashboard data={data[0]} caja={caja} setTab={setTab} tabs={visibleTabs} /><QuickSalePicker products={catalog} onAdd={addToCart} /></> : <>
                {tab === 'Stock' && profile?.rol === 'ADMIN' && <ProductForm values={productForm} onChange={setProductForm} busy={busy} onSubmit={createProduct} editing={!!editingProductId} visible={productModalOpen} onOpen={openNewProduct} onClose={closeProductModal} error={error} location={productLocation} locationBusy={locationBusy} onCaptureLocation={captureProductLocation} onScanCode={() => { setScannerPurpose('product'); setScannerOpen(true); }} onCancel={() => { setEditingProductId(null); setProductForm({ codigo: '', nombre: '', descripcion: '', imagenUrl: '', precioCosto: '', precioVenta: '', stockInicial: '0', stockMinimo: '0' }); }} />}
                {tab === 'Usuarios' && profile?.rol === 'ADMIN' && <UserManagement rows={data} values={userForm} editing={!!editingUserId} busy={busy} onChange={setUserForm} onSubmit={saveUser} onCancel={() => { setEditingUserId(null); setUserForm({ email: '', nombre: '', password: '', rol: 'CAJERO' }); }} onEdit={startUserEdit} onToggleActive={toggleUserActive} />}
                {tab === 'Ventas' && <CartPanel lines={cart} total={cartTotal} busy={busy} onChange={changeCartQuantity} onRemove={id => setCart(lines => lines.filter(line => Number(line.product.id) !== id))} onSubmit={createSale} />}
                {tab === 'Facturas' && <View style={styles.formPanel}><Text style={styles.sectionTitle}>Emitir comprobante B</Text><Text style={styles.muted}>Solo para ventas pagadas · comprobante interno, sin ARCA.</Text><View style={styles.formRow}><Field label="ID de venta" value={productId} onChangeText={setProductId} keyboardType="number-pad" placeholder="Ej. 1" /><Field label="Nombre del cliente" value={clientName} onChangeText={setClientName} /><Button label="Emitir comprobante" loading={busy} onPress={() => { const id = Number(productId); if (!Number.isInteger(id) || id < 1) { setError('Ingresá un ID de venta válido.'); return; } void action(() => request(`/facturas/ventas/${id}`, { method: 'POST', body: JSON.stringify({ clienteNombre: clientName }) }), 'Comprobante B interno emitido.'); }} /></View></View>}
                {tab === 'Clientes' && <ClientForm values={clientForm} onChange={setClientForm} busy={busy} onSubmit={createClient} />}
                {tab === 'Caja' && <View style={styles.cashStrip}><View><Text style={styles.tableLabel}>CAJA ACTUAL</Text><Text style={styles.cashValue}>{caja?.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</Text></View><View><Text style={styles.tableLabel}>FONDO INICIAL</Text><Text style={styles.cashValue}>{caja?.id ? money(caja.montoInicial) : '—'}</Text></View><View><Text style={styles.tableLabel}>VENTAS COBRADAS</Text><Text style={styles.cashValue}>{money(cashSummary.sales)}</Text></View><View><Text style={styles.tableLabel}>EFECTIVO ESPERADO</Text><Text style={styles.cashValue}>{money(cashSummary.expected)}</Text></View><View><Text style={styles.tableLabel}>MOVIMIENTOS</Text><Text style={styles.cashValue}>{data.length}</Text></View>{profile?.rol === 'ADMIN' && caja?.estado === 'ABIERTA' && <Button label="Cerrar caja" loading={busy} onPress={confirmCloseCash} />}{profile?.rol === 'ADMIN' && caja?.estado !== 'ABIERTA' && <View style={styles.cashOpenControl}><Field label="Fondo para abrir caja" value={openingCashAmount} onChangeText={setOpeningCashAmount} keyboardType="decimal-pad" placeholder="0" /><Button label="Abrir caja" loading={busy} onPress={openCash} /></View>}</View>}
                {tab === 'Caja' && profile?.rol === 'ADMIN' && <CashHistoryPanel rows={filteredCashHistory} search={cashSearch} onSearch={setCashSearch} onView={viewCashbox} />}
                  {tab !== 'Usuarios' && <View style={styles.tablePanel}>
                  <View style={styles.tableToolbar}><View style={styles.tableTitleWrap}><Text style={styles.tableTitle}>{tab === 'Stock' ? 'Inventario' : tab === 'Ventas' ? 'Ventas recientes' : tab === 'Caja' ? 'Movimientos' : tab === 'Clientes' ? 'Clientes' : 'Comprobantes'}</Text><Text style={styles.muted}>{filteredData.length} registros</Text></View><TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder={`Filtrar ${tab === 'Stock' ? 'productos' : tab.toLocaleLowerCase('es-AR')}…`} placeholderTextColor={colors.faint} /></View>
                  {tab === 'Ventas' && profile?.rol === 'ADMIN' && <CashierFilter cashiers={cashiers} selected={selectedCashier} onSelect={setSelectedCashier} />}
                  <DataTable tab={tab} rows={pageData} busy={busy} isAdmin={profile?.rol === 'ADMIN'} onConfirm={id => void action(() => request(`/ventas/${id}/confirmar`, { method: 'POST' }), 'Venta confirmada y cobrada en Caja.')} onRetry={id => void action(() => request(`/ventas/${id}/reintentar-confirmacion`, { method: 'POST' }), 'Confirmación recuperada.')} onAddCart={addToCart} onEditProduct={startProductEdit} onViewLocation={openProductLocation} />
                  {!filteredData.length && <Empty label={query ? 'No encontramos resultados para ese filtro.' : tab === 'Facturas' ? 'Todavía no hay comprobantes emitidos.' : 'No hay registros para mostrar.'} />}
                  <Pagination page={page} pageCount={pageCount} setPage={setPage} />
                  </View>}
              </>}
            </Animated.ScrollView>
            {busy && <View style={styles.busyBar}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}> Procesando…</Text></View>}
          </View>
        </View>
      ) : (
        <View style={styles.mobileLayout}>
          <View style={styles.header}>
            <View style={styles.mobileBrand}>
              <Pressable onPress={() => setMenuOpen(true)} style={styles.hamburgerButton} accessibilityRole="button" accessibilityLabel="Abrir menú">
                <Text style={styles.hamburgerIcon}>☰</Text>
              </Pressable>
              <View style={styles.mobileLogoBadge}><Image source={require('../../assets/pintame-logo.png')} style={styles.mobileLogo} resizeMode="contain" accessibilityLabel="Pintame Pinturería" /></View>
              <View style={styles.mobileGreetingWrap}><Text numberOfLines={1} style={styles.greeting}>{profile?.nombre || 'Pinturería'}</Text><Text style={styles.mobileCaption}>{profile?.rol === 'ADMIN' ? 'Administrador' : 'Punto de venta'}</Text></View>
            </View>
            <View style={styles.headerActions}><CartButton count={cartCount} total={cartTotal} onPress={() => setTab('Ventas')} compact /><Pressable onPress={signOut} style={styles.logout}><Text style={styles.logoutText}>Salir</Text></Pressable></View>
          </View>
          <Animated.ScrollView style={[styles.body, { opacity: screenTransition, transform: [{ translateY: screenTransition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshCurrentTab} tintColor={colors.accent} />}>
            <View style={styles.pageHeading}><View><Text style={styles.pageTitle}>{title}</Text><Text style={styles.subtitle}>{tab === 'Stock' ? 'Productos y disponibilidad' : tab === 'Ventas' ? 'Ventas pendientes y cobradas' : tab === 'Clientes' ? 'Cartera de clientes' : tab === 'Facturas' ? 'Comprobantes internos B' : tab === 'Caja' ? 'Estado y movimientos' : 'Resumen del negocio'}</Text></View><Pressable disabled={refreshing} onPress={() => void refreshCurrentTab()} style={styles.mobileRefresh}>{refreshing ? <ActivityIndicator size="small" color={colors.accent} /> : <Text style={styles.refreshText}>↻</Text>}</Pressable></View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {tab === 'Inicio' && <><Dashboard data={data[0]} caja={caja} setTab={setTab} tabs={visibleTabs} /><QuickSalePicker products={catalog} onAdd={addToCart} onScan={() => { setScannerPurpose('sale'); setScannerOpen(true); }} /></>}
            {tab === 'Stock' && <>{profile?.rol === 'ADMIN' && <ProductForm values={productForm} onChange={setProductForm} busy={busy} onSubmit={createProduct} editing={!!editingProductId} visible={productModalOpen} onOpen={openNewProduct} onClose={closeProductModal} error={error} location={productLocation} locationBusy={locationBusy} onCaptureLocation={captureProductLocation} onScanCode={() => { setScannerPurpose('product'); setScannerOpen(true); }} onCancel={() => { setEditingProductId(null); setProductForm({ codigo: '', nombre: '', descripcion: '', imagenUrl: '', precioCosto: '', precioVenta: '', stockInicial: '0', stockMinimo: '0' }); }} />}<TextInput style={styles.searchInputMobile} value={query} onChangeText={setQuery} placeholder="Buscar producto…" placeholderTextColor={colors.faint} />{pageData.map((item, i) => { const level = stockLevel(item.stockActual); return <View style={styles.rowCard} key={item.id ?? i}><View style={styles.rowTop}><View style={styles.productIdentity}><ProductThumb product={item} /><Text style={styles.itemTitle}>{nameOf(item)}</Text></View><Text style={[styles.pill, level.tone === 'red' && styles.pillRed, level.tone === 'yellow' && styles.pillYellow, level.tone === 'green' && styles.pillGreen]}>{level.label}</Text></View><Text style={styles.muted}>{item.codigo || `Producto #${item.id}`} · Stock: {item.stockActual ?? 0}</Text>{item.ubicacionLatitud != null && item.ubicacionLongitud != null && <Pressable onPress={() => openProductLocation(item)} style={styles.productMapLink}><Text style={styles.productMapText}>⌖ Ver ubicación de alta · {Number(item.ubicacionLatitud).toFixed(5)}, {Number(item.ubicacionLongitud).toFixed(5)}</Text></Pressable>}<View style={styles.stockActions}><Text style={styles.itemPrice}>{money(item.precioVenta)}</Text><View style={styles.headerActions}>{profile?.rol === 'ADMIN' && <Pressable onPress={() => startProductEdit(item)} style={styles.smallAction}><Text style={styles.smallActionText}>Editar</Text></Pressable>}<AddToCartButton disabled={Number(item.stockActual) <= 0} onPress={() => addToCart(item)} /></View></View></View>;})}{!filteredData.length && <Empty />}</>}
            {tab === 'Ventas' && <><CartPanel lines={cart} total={cartTotal} busy={busy} onChange={changeCartQuantity} onRemove={id => setCart(lines => lines.filter(line => Number(line.product.id) !== id))} onSubmit={createSale} location={saleLocation} locationBusy={locationBusy} onCaptureLocation={captureSaleLocation} />{profile?.rol === 'ADMIN' && <CashierFilter cashiers={cashiers} selected={selectedCashier} onSelect={setSelectedCashier} />}<TextInput style={styles.searchInputMobile} value={query} onChangeText={setQuery} placeholder="Buscar venta…" placeholderTextColor={colors.faint} />{pageData.map((sale, i) => <View style={styles.rowCard} key={sale.id ?? i}><View style={styles.rowTop}><Text style={styles.itemTitle}>{sale.numero || `Venta #${sale.id}`}</Text><Text style={[styles.pill, sale.estado === 'PAGADA' && styles.pillGreen]}>{sale.estado}</Text></View><Text style={styles.muted}>{sale.detalles?.length ?? 0} artículos · {dateOf(sale.fecha)}</Text><Text style={styles.muted}>Cajero: {sale.usuarioNombre || 'Sin asignar (venta anterior)'}</Text>{sale.ubicacionLatitud != null && <Text style={styles.muted}>Ubicación registrada</Text>}<Text style={styles.itemPrice}>{money(sale.total)}</Text>{sale.estado === 'PENDIENTE' && <Button label="Confirmar y cobrar" loading={busy} onPress={() => void action(() => request(`/ventas/${sale.id}/confirmar`, { method: 'POST' }), 'Venta confirmada y cobrada en Caja.')} />}{profile?.rol === 'ADMIN' && sale.estado === 'PROCESANDO' && <Button label="Recuperar confirmación" loading={busy} onPress={() => void action(() => request(`/ventas/${sale.id}/reintentar-confirmacion`, { method: 'POST' }), 'Confirmación recuperada.')} />}</View>)}</>}
            {tab === 'Usuarios' && profile?.rol === 'ADMIN' && <UserManagement rows={data} values={userForm} editing={!!editingUserId} busy={busy} onChange={setUserForm} onSubmit={saveUser} onCancel={() => { setEditingUserId(null); setUserForm({ email: '', nombre: '', password: '', rol: 'CAJERO' }); }} onEdit={startUserEdit} onToggleActive={toggleUserActive} />}
            {tab === 'Caja' && <><View style={styles.cashCard}><Text style={styles.tableLabel}>ESTADO DE CAJA</Text><Text style={styles.cashValue}>{caja?.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</Text><Text style={styles.muted}>{caja?.id ? `Caja #${caja.id} · Fondo inicial ${money(caja.montoInicial)}` : 'No hay una caja abierta.'}</Text><View style={styles.cashTotals}><View style={styles.cashTotalItem}><Text style={styles.tableLabel}>VENTAS COBRADAS</Text><Text style={styles.cashTotalValue}>{money(cashSummary.sales)}</Text></View><View style={styles.cashTotalItem}><Text style={styles.tableLabel}>EFECTIVO ESPERADO</Text><Text style={styles.cashTotalValue}>{money(cashSummary.expected)}</Text></View></View>{profile?.rol === 'ADMIN' && caja?.estado === 'ABIERTA' && <Button label="Cerrar caja" loading={busy} onPress={confirmCloseCash} />}{profile?.rol === 'ADMIN' && caja?.estado !== 'ABIERTA' && <View style={styles.cashOpenControl}><Field label="Fondo para abrir caja" value={openingCashAmount} onChangeText={setOpeningCashAmount} keyboardType="decimal-pad" placeholder="0" /><Button label="Abrir caja" loading={busy} onPress={openCash} /></View>}</View>{profile?.rol === 'ADMIN' && <CashHistoryPanel rows={filteredCashHistory} search={cashSearch} onSearch={setCashSearch} onView={viewCashbox} />}<Text style={styles.sectionTitle}>Movimientos de la caja seleccionada</Text>{pageData.map((move, i) => <View style={styles.rowCard} key={move.id ?? i}><View style={styles.rowTop}><Text style={styles.itemTitle}>{move.tipo || move.descripcion}</Text><Text style={styles.itemPrice}>{money(move.monto)}</Text></View><Text style={styles.muted}>{move.descripcion || move.referencia || 'Movimiento de caja'} · {dateOf(move.fecha)}</Text></View>)}</>}
            {tab === 'Clientes' && <><ClientForm values={clientForm} onChange={setClientForm} busy={busy} onSubmit={createClient} /><TextInput style={styles.searchInputMobile} value={query} onChangeText={setQuery} placeholder="Buscar cliente…" placeholderTextColor={colors.faint} />{pageData.map((client, i) => <View style={styles.rowCard} key={client.id ?? i}><View style={styles.rowTop}><Text style={styles.itemTitle}>{nameOf(client)}</Text><Text style={[styles.pill, client.activo && styles.pillGreen]}>{client.activo ? 'ACTIVO' : 'INACTIVO'}</Text></View><Text style={styles.muted}>DNI {client.dni || '—'} · {client.telefono || 'Sin teléfono'}</Text></View>)}</>}
            {tab === 'Facturas' && <><View style={styles.formPanel}><Text style={styles.sectionTitle}>Emitir comprobante B</Text><Field label="ID de venta pagada" value={productId} onChangeText={setProductId} keyboardType="number-pad" placeholder="Ej. 1" /><Field label="Nombre del cliente" value={clientName} onChangeText={setClientName} /><Button label="Emitir comprobante" loading={busy} onPress={() => { const id = Number(productId); if (!Number.isInteger(id) || id < 1) { setError('Ingresá un ID de venta válido.'); return; } void action(() => request(`/facturas/ventas/${id}`, { method: 'POST', body: JSON.stringify({ clienteNombre: clientName }) }), 'Comprobante B interno emitido.'); }} /></View><TextInput style={styles.searchInputMobile} value={query} onChangeText={setQuery} placeholder="Buscar comprobante…" placeholderTextColor={colors.faint} />{pageData.map((invoice, i) => <View style={styles.rowCard} key={invoice.id ?? i}><View style={styles.rowTop}><Text style={styles.itemTitle}>{invoice.numero || `Comprobante #${invoice.id}`}</Text><Text style={styles.pill}>{invoice.estado}</Text></View><Text style={styles.muted}>{invoice.clienteNombre} · Venta #{invoice.ventaId}</Text><Text style={styles.itemPrice}>{money(invoice.total)}</Text></View>)}</>}
            {tab !== 'Inicio' && tab !== 'Usuarios' && !filteredData.length && <Empty label={query ? 'No encontramos resultados para ese filtro.' : tab === 'Facturas' ? 'Todavía no hay comprobantes emitidos.' : 'No hay registros para mostrar.'} />}
            {tab !== 'Inicio' && <Pagination page={page} pageCount={pageCount} setPage={setPage} />}
          </Animated.ScrollView>
          {cartCount > 0 && <CartBar count={cartCount} total={cartTotal} onPress={() => setTab('Ventas')} />}
          {busy && <View style={styles.busyBar}><ActivityIndicator color={colors.accent} /><Text style={styles.muted}> Procesando…</Text></View>}
          <MobileDrawer visible={menuOpen} tabs={visibleTabs} activeTab={tab} name={profile?.nombre || profile?.email || 'Usuario'} role={profile?.rol || 'CAJERO'} themeMode={themeMode} onToggleTheme={toggleTheme} onClose={() => setMenuOpen(false)} onSelect={selected => { setTab(selected); setMenuOpen(false); setQuery(''); }} onSignOut={signOut} />
          {scannerOpen && <BarcodeScanner visible purpose={scannerPurpose} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} />}
        </View>
      )}
    </SafeAreaView>
  );
}

function LoginScreen(props: { apiUrl: string; setApiUrl: (v: string) => void; email: string; setEmail: (v: string) => void; password: string; setPassword: (v: string) => void; busy: boolean; error: string; themeMode: 'claro' | 'oscuro'; onToggleTheme: () => void; onLogin: () => void }) {
  return <SafeAreaView style={styles.safe}><StatusBar style={props.themeMode === 'oscuro' ? 'light' : 'dark'} /><KeyboardAvoidingView style={styles.loginWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.loginContent} keyboardShouldPersistTaps="handled">
    <View style={styles.loginLogoBadge}><Image source={require('../../assets/pintame-logo.png')} style={styles.loginLogo} resizeMode="contain" accessibilityLabel="Pintame Pinturería" /></View><Text style={styles.loginTitle}>Tu negocio, a mano.</Text><Text style={styles.loginIntro}>Ingresá con tu usuario del sistema para continuar.</Text><Pressable onPress={props.onToggleTheme} style={styles.loginThemeToggle}><Text style={styles.loginThemeToggleText}>{props.themeMode === 'oscuro' ? '☀  Usar modo claro' : '☾  Usar modo oscuro'}</Text></Pressable>
    <View style={styles.form}><Field label="Servidor API" value={props.apiUrl} onChangeText={props.setApiUrl} autoCapitalize="none" keyboardType="url" placeholder="http://192.168.1.10:3010" /><Text style={styles.hint}>En el teléfono, usá la IP local de la computadora en la misma red Wi-Fi.</Text><Field label="Email" value={props.email} onChangeText={props.setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="admin@pintame.local" /><Field label="Contraseña" value={props.password} onChangeText={props.setPassword} secureTextEntry placeholder="Tu contraseña" /><Text>{props.error ? <Text style={styles.error}>{props.error}</Text> : null}</Text><Button label="Ingresar" loadingLabel="Conectando…" loading={props.busy} onPress={props.onLogin} /></View>
  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; keyboardType?: any; secureTextEntry?: boolean; autoCapitalize?: any }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{props.label}</Text><TextInput style={styles.input} value={props.value} onChangeText={props.onChangeText} placeholder={props.placeholder} placeholderTextColor={colors.faint} keyboardType={props.keyboardType} secureTextEntry={props.secureTextEntry} autoCapitalize={props.autoCapitalize || 'sentences'} autoCorrect={false} /></View>;
}
function Button(props: { label: string; loadingLabel?: string; onPress: () => void; loading?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (toValue: number) => Animated.spring(scale, { toValue, damping: 15, stiffness: 260, useNativeDriver: true }).start();
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable disabled={props.loading} style={({ pressed }) => [styles.button, pressed && styles.pressed, props.loading && styles.disabled]} onPressIn={() => press(0.97)} onPressOut={() => press(1)} onPress={props.onPress}>{props.loading ? <View style={styles.buttonLoading}><ActivityIndicator size="small" color={colors.white} /><Text style={styles.buttonText}>{props.loadingLabel || props.label}</Text></View> : <Text style={styles.buttonText}>{props.label}</Text>}</Pressable></Animated.View>;
}
function Empty(props: { label?: string }) { return <View style={styles.empty}><Text style={styles.emptyIcon}>◦</Text><Text style={styles.muted}>{props.label || 'No hay elementos para mostrar.'}</Text></View>; }

function ProductThumb(props: { product: AnyRecord; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const image = imageForProduct(props.product);
  return <View style={[styles.productImageBox, props.small && styles.productImageBoxSmall]}>
    {image && !failed
      ? <Image source={{ uri: image }} style={styles.productPhoto} resizeMode="contain" onError={() => setFailed(true)} accessibilityLabel={`Imagen de ${nameOf(props.product)}`} />
      : <Text style={[styles.productFallback, props.small && styles.productFallbackSmall]}>{productMark(props.product)}</Text>}
  </View>;
}

function CartButton(props: { count: number; total: number; onPress: () => void; compact?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!props.count) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 24, bounciness: 8, useNativeDriver: true }),
    ]).start();
  }, [props.count, scale]);
  return <Pressable onPress={props.onPress} style={[styles.cartButton, props.compact && styles.cartButtonCompact]} accessibilityRole="button" accessibilityLabel={`Carrito con ${props.count} unidades, total ${money(props.total)}`}>
    <Animated.Text style={[styles.cartIcon, { transform: [{ scale }] }]}>🛒</Animated.Text>
    <Text style={styles.cartButtonText}>{props.compact ? props.count : `Carrito · ${props.count} · ${money(props.total)}`}</Text>
  </Pressable>;
}

function AddToCartButton(props: { onPress: () => void; disabled?: boolean; compact?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  const animatePress = (toValue: number) => Animated.spring(scale, { toValue, damping: 12, stiffness: 300, useNativeDriver: true }).start();
  const add = () => {
    props.onPress();
    setAdded(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 850);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.14, duration: 90, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 280, useNativeDriver: true }),
    ]).start();
  };
  return <Animated.View style={{ transform: [{ scale }] }}>
    <Pressable disabled={props.disabled} onPress={add} onPressIn={() => animatePress(0.9)} onPressOut={() => animatePress(1)} style={[props.compact ? styles.addCircle : styles.addButton, props.disabled && styles.disabled, added && styles.addButtonSuccess]} accessibilityRole="button" accessibilityLabel={added ? 'Producto agregado al carrito' : 'Agregar producto al carrito'}>
      <Text style={[props.compact ? styles.addCircleText : styles.addButtonText, added && styles.addButtonSuccessText]}>{added ? '✓' : props.compact ? '＋' : '＋ Agregar'}</Text>
    </Pressable>
  </Animated.View>;
}

function CartBar(props: { count: number; total: number; onPress: () => void }) {
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(appear, { toValue: 1, damping: 17, stiffness: 190, useNativeDriver: true }).start();
  }, [appear]);
  return <Animated.View style={{ opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
    <Pressable style={styles.cartBar} onPress={props.onPress} accessibilityRole="button">
      <Text style={styles.cartBarIcon}>🛒</Text>
      <View style={styles.cartBarText}><Text style={styles.cartBarTitle}>Carrito · {props.count} {props.count === 1 ? 'unidad' : 'unidades'}</Text><Text style={styles.cartBarTotal}>{money(props.total)}</Text></View>
      <Text style={styles.cartBarAction}>Ver venta ›</Text>
    </Pressable>
  </Animated.View>;
}

function QuickSalePicker(props: { products: AnyRecord[]; onAdd: (product: AnyRecord) => void; onScan?: () => void }) {
  const [query, setQuery] = useState('');
  const filtered = props.products.filter(product => {
    const searchable = `${product.codigo ?? ''} ${product.nombre ?? ''} ${product.descripcion ?? ''}`;
    return searchable.toLocaleLowerCase('es-AR').includes(query.trim().toLocaleLowerCase('es-AR'));
  });
  return <View style={styles.quickSalePanel}>
    <View style={styles.quickSaleHeading}><View><Text style={styles.sectionTitle}>Venta rápida</Text><Text style={styles.muted}>Sumá productos desde acá o escaneá su código.</Text></View>{props.onScan && <Pressable style={styles.scanButton} onPress={props.onScan}><Text style={styles.scanButtonText}>▦  Escanear</Text></Pressable>}</View>
    <TextInput style={styles.searchInputMobile} value={query} onChangeText={setQuery} placeholder="Buscar por nombre o código…" placeholderTextColor={colors.faint} />
    {filtered.map(product => <View style={styles.quickSaleRow} key={product.id}>
      <ProductThumb product={product} small />
      <View style={styles.quickSaleInfo}><Text numberOfLines={1} style={styles.quickSaleName}>{nameOf(product)}</Text><Text style={styles.quickSalePrice}>{money(product.precioVenta)} · Stock {product.stockActual ?? 0}</Text></View>
      <AddToCartButton compact disabled={Number(product.stockActual) <= 0} onPress={() => props.onAdd(product)} />
    </View>)}
    {!filtered.length && <Empty label={query ? 'No encontramos ese producto.' : 'No hay productos disponibles.'} />}
  </View>;
}

function MobileDrawer(props: { visible: boolean; tabs: Tab[]; activeTab: Tab; name: string; role: string; themeMode: 'claro' | 'oscuro'; onToggleTheme: () => void; onClose: () => void; onSelect: (tab: Tab) => void; onSignOut: () => void }) {
  const icons: Record<Tab, string> = { Inicio: '⌂', Stock: '▤', Ventas: '↻', Caja: '◷', Clientes: '♙', Facturas: '▧', Usuarios: '♟' };
  return <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose} statusBarTranslucent>
    <View style={styles.drawerRoot}>
      <Pressable style={styles.drawerScrim} onPress={props.onClose} accessibilityRole="button" accessibilityLabel="Cerrar menú" />
      <View style={styles.drawerPanel}>
        <View style={styles.drawerHeader}>
          <View style={styles.drawerLogo}><Image source={require('../../assets/pintame-logo.png')} style={styles.drawerLogoImage} resizeMode="contain" /></View>
          <View style={styles.drawerUser}><Text numberOfLines={1} style={styles.drawerName}>{props.name}</Text><Text style={styles.drawerRole}>{props.role === 'ADMIN' ? 'Administrador' : 'Cajero'}</Text></View>
          <Pressable onPress={props.onClose} style={styles.drawerClose}><Text style={styles.drawerCloseText}>×</Text></Pressable>
        </View>
        <Text style={styles.drawerSection}>MENÚ PRINCIPAL</Text>
        <ScrollView contentContainerStyle={styles.drawerLinks}>
          {props.tabs.map(item => <Pressable key={item} onPress={() => props.onSelect(item)} style={[styles.drawerLink, props.activeTab === item && styles.drawerLinkActive]}>
            <Text style={[styles.drawerLinkIcon, props.activeTab === item && styles.drawerLinkActiveText]}>{icons[item]}</Text>
            <Text style={[styles.drawerLinkText, props.activeTab === item && styles.drawerLinkActiveText]}>{navLabels[item]}</Text>
            {props.activeTab === item && <View style={styles.drawerActiveMark} />}
          </Pressable>)}
        </ScrollView>
        <Pressable onPress={props.onToggleTheme} style={styles.themeToggle}><Text style={styles.drawerLinkIcon}>{props.themeMode === 'oscuro' ? '☀' : '☾'}</Text><Text style={styles.drawerLinkText}>Cambiar a modo {props.themeMode === 'oscuro' ? 'claro' : 'oscuro'}</Text></Pressable>
        <Pressable onPress={props.onSignOut} style={styles.drawerSignOut}><Text style={styles.drawerSignOutIcon}>↪</Text><Text style={styles.drawerSignOutText}>Cerrar sesión</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

function BarcodeScanner(props: { visible: boolean; purpose: 'sale' | 'product'; onClose: () => void; onScan: (result: BarcodeScanningResult) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  return <Modal visible={props.visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
    <View style={styles.scannerPage}>
      <View style={styles.scannerTop}><Pressable onPress={props.onClose} style={styles.scannerClose}><Text style={styles.scannerCloseText}>‹</Text></Pressable><View><Text style={styles.scannerTitle}>{props.purpose === 'product' ? 'Escanear código del producto' : 'Escanear producto'}</Text><Text style={styles.scannerSubtitle}>Apuntá al código de barras</Text></View></View>
      {!permission ? <View style={styles.scannerPermission}><ActivityIndicator color={colors.white} /></View> : !permission.granted ? <View style={styles.scannerPermission}><Text style={styles.scannerPermissionText}>Pintame necesita usar la cámara para leer el código del producto.</Text><Pressable style={styles.scannerPermissionButton} onPress={() => void requestPermission()}><Text style={styles.scannerPermissionButtonText}>Permitir cámara</Text></Pressable></View> : <View style={styles.cameraFrame}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }} onBarcodeScanned={result => { if (scanned.current) return; scanned.current = true; props.onScan(result); }} />
        <View pointerEvents="none" style={styles.viewfinderWrap}><View style={styles.viewfinder}><View style={[styles.viewfinderCorner, styles.cornerTL]} /><View style={[styles.viewfinderCorner, styles.cornerTR]} /><View style={[styles.viewfinderCorner, styles.cornerBL]} /><View style={[styles.viewfinderCorner, styles.cornerBR]} /></View><Text style={styles.viewfinderCaption}>Centrà el código dentro del recuadro</Text></View>
      </View>}
      <View style={styles.scannerFooter}><Text style={styles.scannerFooterText}>{props.purpose === 'product' ? 'El código leído se completa en el formulario del producto.' : 'Se agrega al carrito si el código coincide con el código guardado del producto.'}</Text></View>
    </View>
  </Modal>;
}

type ProductFormValues = { codigo: string; nombre: string; descripcion: string; imagenUrl: string; precioCosto: string; precioVenta: string; stockInicial: string; stockMinimo: string };
function ProductForm(props: {
  values: ProductFormValues;
  onChange: (values: ProductFormValues) => void;
  busy: boolean;
  onSubmit: () => void;
  editing?: boolean;
  visible: boolean;
  error: string;
  location: { latitude: number; longitude: number } | null;
  locationBusy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCaptureLocation: () => void;
  onScanCode: () => void;
  onCancel?: () => void;
}) {
  const set = (key: keyof ProductFormValues, value: string) => props.onChange({ ...props.values, [key]: value });
  const close = () => { props.onClose(); props.onCancel?.(); };
  return <>
    {!props.editing && <View style={styles.productModalTrigger}><View style={styles.quickSaleInfo}><Text style={styles.sectionTitle}>Catálogo de productos</Text><Text style={styles.muted}>Creá artículos nuevos desde el formulario.</Text></View><Button label="＋ Nuevo producto" onPress={props.onOpen} /></View>}
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.productModalBackdrop}>
        <Pressable style={styles.productModalScrim} onPress={close} accessibilityRole="button" accessibilityLabel="Cerrar formulario" />
        <KeyboardAvoidingView style={styles.productModalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.productModalCard}>
            <View style={styles.productModalHeader}><View><Text style={styles.tableTitle}>{props.editing ? 'Editar producto' : 'Nuevo producto'}</Text><Text style={styles.muted}>Completá los datos del artículo.</Text></View><Pressable onPress={close} style={styles.drawerClose}><Text style={styles.drawerCloseText}>×</Text></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.productModalContent}>
              {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
              <View style={styles.formPanel}>
                <Text style={styles.muted}>Podés pegar una URL HTTPS de la foto para identificarlo en el inventario.</Text>
                <View style={styles.productCodeRow}><View style={styles.productCodeField}><Field label="Código *" value={props.values.codigo} onChangeText={value => set('codigo', value)} placeholder="PNT-LAT-20L" autoCapitalize="characters" /></View><Pressable style={styles.scanProductCode} onPress={props.onScanCode}><Text style={styles.scanButtonText}>▦ Escanear</Text></Pressable></View>
                <View style={styles.clientFieldGrid}>
                  <Field label="Nombre *" value={props.values.nombre} onChangeText={value => set('nombre', value)} placeholder="Látex interior blanco" />
                  <Field label="Precio de costo *" value={props.values.precioCosto} onChangeText={value => set('precioCosto', value)} keyboardType="decimal-pad" placeholder="0" />
                  <Field label="Precio de venta *" value={props.values.precioVenta} onChangeText={value => set('precioVenta', value)} keyboardType="decimal-pad" placeholder="0" />
                  {!props.editing && <Field label="Stock inicial" value={props.values.stockInicial} onChangeText={value => set('stockInicial', value)} keyboardType="decimal-pad" placeholder="0" />}
                  <Field label="Stock mínimo" value={props.values.stockMinimo} onChangeText={value => set('stockMinimo', value)} keyboardType="decimal-pad" placeholder="0" />
                  <Field label="URL de imagen HTTPS" value={props.values.imagenUrl} onChangeText={value => set('imagenUrl', value)} autoCapitalize="none" placeholder="https://…" />
                  <Field label="Descripción" value={props.values.descripcion} onChangeText={value => set('descripcion', value)} placeholder="Presentación, color…" />
                </View>
                {!props.editing && <Pressable disabled={props.locationBusy} onPress={props.onCaptureLocation} style={styles.productLocationButton}>
                  <Text style={styles.locationIcon}>{props.location ? '✓' : '⌖'}</Text><View style={styles.locationCopy}><Text style={styles.locationTitle}>{props.location ? 'Ubicación adjunta' : 'Guardar ubicación del alta'}</Text><Text style={styles.locationSubtitle}>{props.location ? `${props.location.latitude.toFixed(5)}, ${props.location.longitude.toFixed(5)}` : 'Opcional · se guarda con el producto'}</Text></View>{props.locationBusy ? <ActivityIndicator color={colors.accent2} /> : <Text style={styles.locationArrow}>{props.location ? '×' : '›'}</Text>}
                </Pressable>}
                <Button label={props.editing ? 'Guardar cambios' : 'Crear producto'} loading={props.busy} onPress={props.onSubmit} />
                <Pressable onPress={close} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  </>;
}

type UserFormValues = { email: string; nombre: string; password: string; rol: 'ADMIN' | 'CAJERO' };
function UserManagement(props: { rows: AnyRecord[]; values: UserFormValues; editing: boolean; busy: boolean; onChange: (value: UserFormValues) => void; onSubmit: () => void; onCancel: () => void; onEdit: (user: AnyRecord) => void; onToggleActive: (user: AnyRecord) => void }) {
  const set = (key: keyof UserFormValues, value: string) => props.onChange({ ...props.values, [key]: value });
  return <>
    <View style={styles.formPanel}>
      <Text style={styles.sectionTitle}>{props.editing ? 'Actualizar usuario' : 'Crear cajero'}</Text>
      {!props.editing && <Field label="Email de acceso *" value={props.values.email} onChangeText={value => set('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="cajero@pintame.local" />}
      {props.editing && <Text style={styles.muted}>Cuenta: {props.values.email}</Text>}
      <Field label="Nombre *" value={props.values.nombre} onChangeText={value => set('nombre', value)} placeholder="Nombre del cajero" />
      <Field label={props.editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'} value={props.values.password} onChangeText={value => set('password', value)} secureTextEntry placeholder="Al menos 8 caracteres" />
      {props.editing && <Pressable onPress={() => set('rol', props.values.rol === 'ADMIN' ? 'CAJERO' : 'ADMIN')} style={styles.roleToggle}><Text style={styles.roleToggleText}>Rol actual: {props.values.rol} · Tocar para cambiar</Text></Pressable>}
      <Button label={props.busy ? 'Guardando…' : props.editing ? 'Guardar cambios' : 'Crear cajero'} loading={props.busy} onPress={props.onSubmit} />
      {props.editing && <Pressable onPress={props.onCancel} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar edición</Text></Pressable>}
    </View>
    <Text style={styles.sectionTitle}>Equipo</Text>
    {props.rows.map((user, i) => <View style={styles.rowCard} key={user.id ?? i}>
      <View style={styles.rowTop}><View style={styles.quickSaleInfo}><Text style={styles.itemTitle}>{user.nombre}</Text><Text style={styles.muted}>{user.email}</Text></View><Text style={[styles.pill, user.activo ? styles.pillGreen : styles.pillRed]}>{user.rol} · {user.activo ? 'ACTIVO' : 'INACTIVO'}</Text></View>
      <View style={[styles.headerActions, styles.userActions]}><Pressable onPress={() => props.onEdit(user)} style={styles.smallAction}><Text style={styles.smallActionText}>Editar</Text></Pressable><Pressable disabled={props.busy} onPress={() => props.onToggleActive(user)} style={[styles.smallAction, !user.activo && styles.userActivate]}><Text style={styles.smallActionText}>{user.activo ? 'Desactivar' : 'Activar'}</Text></Pressable></View>
    </View>)}
    {!props.rows.length && <Empty label="Todavía no hay usuarios cargados." />}
  </>;
}

function CashHistoryPanel(props: { rows: AnyRecord[]; search: string; onSearch: (value: string) => void; onView: (box: AnyRecord) => void }) {
  return <View style={styles.cashHistoryPanel}>
    <View style={styles.tableTitleWrap}><Text style={styles.tableTitle}>Historial de cajas</Text><Text style={styles.muted}>{props.rows.length} resultados</Text></View>
    <TextInput style={styles.searchInputMobile} value={props.search} onChangeText={props.onSearch} placeholder="Buscar por número o responsable…" placeholderTextColor={colors.faint} />
    {props.rows.map(box => <View style={styles.cashHistoryCard} key={box.id}>
      <View style={styles.rowTop}><Text style={styles.itemTitle}>Caja #{box.id}</Text><Text style={[styles.pill, box.estado === 'ABIERTA' ? styles.pillYellow : styles.pillGreen]}>{box.estado}</Text></View>
      <Text style={styles.muted}>Abrió: {box.usuarioAperturaNombre || 'Sin registrar'} · {dateOf(box.fechaApertura)}</Text>
      <Text style={styles.muted}>Cerró: {box.usuarioCierreNombre || 'Pendiente'}{box.fechaCierre ? ` · ${dateOf(box.fechaCierre)}` : ''}</Text>
      <View style={styles.cashHistoryAmounts}><Text style={styles.cashHistoryAmountText}>Inicial {money(box.montoInicial)}</Text><Text style={styles.cashHistoryAmountText}>Final {box.estado === 'CERRADA' ? money(box.montoFinal) : '—'}</Text></View>
      <Button label="Ver movimientos" onPress={() => props.onView(box)} />
    </View>)}
    {!props.rows.length && <Empty label={props.search ? 'No hay cajas que coincidan con la búsqueda.' : 'Todavía no hay cajas registradas.'} />}
  </View>;
}

function CashierFilter(props: { cashiers: AnyRecord[]; selected: string; onSelect: (id: string) => void }) {
  return <View style={styles.cashierFilter}><Pressable onPress={() => props.onSelect('')} style={[styles.cashierChip, !props.selected && styles.cashierChipActive]}><Text style={[styles.cashierChipText, !props.selected && styles.cashierChipTextActive]}>Todos</Text></Pressable>{props.cashiers.map(user => <Pressable key={user.id} onPress={() => props.onSelect(String(user.id))} style={[styles.cashierChip, props.selected === String(user.id) && styles.cashierChipActive]}><Text style={[styles.cashierChipText, props.selected === String(user.id) && styles.cashierChipTextActive]}>{user.nombre}</Text></Pressable>)}</View>;
}

type ClientFormValues = { dni: string; nombre: string; apellido: string; email: string; telefono: string; direccion: string };
function ClientForm(props: { values: ClientFormValues; onChange: (values: ClientFormValues) => void; busy: boolean; onSubmit: () => void }) {
  const set = (key: keyof ClientFormValues, value: string) => props.onChange({ ...props.values, [key]: value });
  return <View style={styles.formPanel}>
    <Text style={styles.sectionTitle}>Nuevo cliente</Text>
    <View style={styles.clientFieldGrid}>
      <Field label="DNI *" value={props.values.dni} onChangeText={value => set('dni', value)} keyboardType="number-pad" placeholder="30123456" />
      <Field label="Nombre *" value={props.values.nombre} onChangeText={value => set('nombre', value)} placeholder="Nombre" />
      <Field label="Apellido *" value={props.values.apellido} onChangeText={value => set('apellido', value)} placeholder="Apellido" />
      <Field label="Email" value={props.values.email} onChangeText={value => set('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="cliente@email.com" />
      <Field label="Teléfono" value={props.values.telefono} onChangeText={value => set('telefono', value)} keyboardType="phone-pad" placeholder="299…" />
      <Field label="Dirección" value={props.values.direccion} onChangeText={value => set('direccion', value)} placeholder="Calle y número" />
    </View>
    <Button label={props.busy ? 'Guardando…' : 'Guardar cliente'} loading={props.busy} onPress={props.onSubmit} />
  </View>;
}

function CartPanel(props: { lines: CartLine[]; total: number; busy: boolean; onChange: (id: number, delta: number) => void; onRemove: (id: number) => void; onSubmit: () => void; location?: { latitude: number; longitude: number } | null; locationBusy?: boolean; onCaptureLocation?: () => void }) {
  return <View style={styles.cartPanel}>
    <View style={styles.cartPanelHeading}><View><Text style={styles.tableTitle}>Tu venta</Text><Text style={styles.muted}>{props.lines.reduce((n, line) => n + line.quantity, 0)} unidades</Text></View><Text style={styles.cartPanelTotal}>{money(props.total)}</Text></View>
    <Text style={styles.cartNotice}>La venta queda pendiente. El stock se descuenta y se cobra en Caja al confirmarla.</Text>
    {Platform.OS !== 'web' && props.onCaptureLocation && <Pressable disabled={props.locationBusy} onPress={props.onCaptureLocation} style={styles.locationButton}>
      <Text style={styles.locationIcon}>{props.location ? '✓' : '⌖'}</Text>
      <View style={styles.locationCopy}><Text style={styles.locationTitle}>{props.location ? 'Ubicación adjunta' : 'Registrar ubicación'}</Text><Text style={styles.locationSubtitle}>{props.location ? `${props.location.latitude.toFixed(5)}, ${props.location.longitude.toFixed(5)}` : 'Opcional · se adjunta a esta venta pendiente'}</Text></View>
      {props.locationBusy ? <ActivityIndicator color={colors.accent2} /> : <Text style={styles.locationArrow}>{props.location ? '×' : '›'}</Text>}
    </Pressable>}
    {props.lines.map(line => <View style={styles.cartLine} key={line.product.id}>
      <ProductThumb product={line.product} small />
      <View style={styles.cartLineInfo}><Text numberOfLines={1} style={styles.quickSaleName}>{nameOf(line.product)}</Text><Text style={styles.quickSalePrice}>{money(line.product.precioVenta)} c/u</Text></View>
      <View style={styles.quantityControl}><Pressable onPress={() => props.onChange(Number(line.product.id), -1)} style={styles.quantityButton}><Text style={styles.quantityButtonText}>−</Text></Pressable><Text style={styles.quantityValue}>{line.quantity}</Text><Pressable disabled={line.quantity >= Number(line.product.stockActual)} onPress={() => props.onChange(Number(line.product.id), 1)} style={[styles.quantityButton, line.quantity >= Number(line.product.stockActual) && styles.disabled]}><Text style={styles.quantityButtonText}>＋</Text></Pressable></View>
      <Pressable onPress={() => props.onRemove(Number(line.product.id))} style={styles.removeLine}><Text style={styles.removeLineText}>×</Text></Pressable>
    </View>)}
    {!props.lines.length && <Text style={styles.cartEmpty}>Todavía no agregaste productos. Elegilos en Punto de venta o Productos.</Text>}
    <Button label={props.busy ? 'Procesando…' : 'Crear venta pendiente'} loading={props.busy || !props.lines.length} onPress={props.onSubmit} />
  </View>;
}

function Dashboard(props: { data?: AnyRecord; caja: AnyRecord | null; setTab: (tab: Tab) => void; tabs: Tab[] }) {
  return <>
    <View style={styles.dashboardWelcome}><View style={styles.dashboardCopy}><Text style={styles.dashEyebrow}>RESUMEN DEL DÍA</Text><Text style={styles.dashTitle}>Todo en orden.</Text><Text style={styles.muted}>Accedé rápido a las áreas principales de Pintame.</Text></View><View style={styles.dashboardLogoBadge}><Image source={require('../../assets/pintame-logo.png')} style={styles.dashboardLogo} resizeMode="contain" accessibilityLabel="Pintame Pinturería" /></View></View>
    <View style={styles.stats}>
      <View style={styles.stat}><Text style={styles.statLabel}>PRODUCTOS</Text><Text style={styles.statValue}>{props.data?.products ?? '—'}</Text><Text style={styles.statHint}>en inventario</Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>VENTAS PENDIENTES</Text><Text style={styles.statValue}>{props.data?.pending ?? '—'}</Text><Text style={styles.statHint}>para confirmar</Text></View>
      <View style={styles.stat}><Text style={styles.statLabel}>CAJA</Text><Text style={styles.statValueSmall}>{props.caja?.estado === 'ABIERTA' ? 'Abierta' : 'Cerrada'}</Text><Text style={styles.statHint}>{props.caja?.id ? money(props.caja.montoInicial) + ' inicial' : 'sin turno abierto'}</Text></View>
    </View>
    <Text style={styles.sectionTitle}>Acceso rápido</Text>
    <View style={styles.quickGrid}>{props.tabs.filter(t => t !== 'Inicio').map(t => <Pressable style={styles.quick} key={t} onPress={() => props.setTab(t)}><Text style={styles.quickIcon}>{({ Stock: '▤', Ventas: '↻', Caja: '◷', Clientes: '♙', Facturas: '▧', Usuarios: '♟', Inicio: '▦' } as Record<Tab, string>)[t]}</Text><View><Text style={styles.quickText}>{navLabels[t]}</Text><Text style={styles.quickSub}>{({ Stock: 'Ver inventario', Ventas: 'Revisar ventas', Caja: 'Controlar caja', Clientes: 'Buscar clientes', Facturas: 'Ver comprobantes', Usuarios: 'Gestionar cajeros', Inicio: '' } as Record<Tab, string>)[t]}</Text></View><Text style={styles.quickArrow}>›</Text></Pressable>)}</View>
  </>;
}

function DataTable(props: { tab: Tab; rows: AnyRecord[]; busy: boolean; isAdmin: boolean; onConfirm: (id: number) => void; onRetry: (id: number) => void; onAddCart: (product: AnyRecord) => void; onEditProduct: (product: AnyRecord) => void; onViewLocation: (product: AnyRecord) => void }) {
  const columns: Record<Tab, string[]> = {
    Inicio: [], Stock: ['Producto', 'Código', 'Stock', 'Precio', 'Ubicación', 'Estado'], Ventas: ['Venta', 'Cajero', 'Estado', 'Artículos', 'Total', 'Fecha'],
    Caja: ['Tipo', 'Descripción', 'Monto', 'Fecha'], Clientes: ['Cliente', 'DNI', 'Estado', 'Teléfono'], Facturas: ['Comprobante', 'Cliente', 'Venta', 'Estado', 'Total'], Usuarios: ['Usuario'],
  };
  const values = (row: AnyRecord): (string | { text: string; green?: boolean; tone?: 'red' | 'yellow' | 'green'; product?: AnyRecord; location?: AnyRecord })[] => {
    if (props.tab === 'Stock') { const level = stockLevel(row.stockActual); const hasLocation = row.ubicacionLatitud != null && row.ubicacionLongitud != null; return [{ text: nameOf(row), product: row }, row.codigo || '—', String(row.stockActual ?? 0), money(row.precioVenta), { text: hasLocation ? 'Ver en mapa' : '—', location: hasLocation ? row : undefined }, { text: level.label, tone: level.tone }]; }
    if (props.tab === 'Ventas') return [row.numero || `#${row.id}`, row.usuarioNombre || 'Sin asignar', { text: row.estado || '—', green: row.estado === 'PAGADA' }, String(row.detalles?.length ?? 0), money(row.total), dateOf(row.fecha)];
    if (props.tab === 'Caja') return [row.tipo || '—', row.descripcion || row.referencia || 'Movimiento', money(row.monto), dateOf(row.fecha)];
    if (props.tab === 'Clientes') return [nameOf(row), row.dni || '—', { text: row.activo ? 'Activo' : 'Inactivo', green: !!row.activo }, row.telefono || '—'];
    return [row.numero || `#${row.id}`, row.clienteNombre || 'Consumidor Final', `#${row.ventaId}`, row.estado || '—', money(row.total)];
  };
  return <ScrollView horizontal showsHorizontalScrollIndicator><View style={styles.table}><View style={styles.tableHead}>{columns[props.tab].map((column, index) => <Text key={column} style={[styles.tableHeadText, index === 0 && styles.firstColumn]}>{column.toLocaleUpperCase('es-AR')}</Text>)}{(props.tab === 'Ventas' || props.tab === 'Stock') && <Text style={styles.tableHeadText}>ACCIÓN</Text>}</View>{props.rows.map((row, rowIndex) => <View style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]} key={row.id ?? row.numero ?? rowIndex}>{values(row).map((value, index) => { const cell: AnyRecord = typeof value === 'string' ? { text: value } : value; const cellStyle = [styles.tableCell, index === 0 && styles.firstColumn, cell.green && styles.tableStatus, cell.tone === 'red' && styles.tableStatusRed, cell.tone === 'yellow' && styles.tableStatusYellow, cell.tone === 'green' && styles.tableStatus]; return props.tab === 'Stock' && index === 0 && cell.product ? <View key={index} style={[styles.productTableCell, styles.firstColumn]}><ProductThumb product={cell.product} small /><Text numberOfLines={1} style={styles.productTableText}>{cell.text}</Text></View> : props.tab === 'Stock' && cell.location ? <Pressable key={index} onPress={() => props.onViewLocation(cell.location)} style={styles.tableCell}><Text style={styles.productMapText}>{cell.text}</Text></Pressable> : <Text key={index} numberOfLines={1} style={cellStyle}>{cell.text}</Text>; })}{props.tab === 'Ventas' && <View style={styles.actionCell}>{row.estado === 'PENDIENTE' ? <Pressable disabled={props.busy} onPress={() => props.onConfirm(Number(row.id))} style={styles.smallAction}><Text style={styles.smallActionText}>Confirmar</Text></Pressable> : props.isAdmin && row.estado === 'PROCESANDO' ? <Pressable disabled={props.busy} onPress={() => props.onRetry(Number(row.id))} style={styles.smallAction}><Text style={styles.smallActionText}>Recuperar</Text></Pressable> : <Text style={styles.tableCell}>—</Text>}</View>}{props.tab === 'Stock' && <View style={styles.actionCell}>{props.isAdmin && <Pressable onPress={() => props.onEditProduct(row)} style={[styles.smallAction, { marginBottom: 4 }]}><Text style={styles.smallActionText}>Editar</Text></Pressable>}<AddToCartButton disabled={Number(row.stockActual) <= 0} onPress={() => props.onAddCart(row)} /></View>}</View>)}</View></ScrollView>;
}

function Pagination(props: { page: number; pageCount: number; setPage: (page: number) => void }) {
  if (props.pageCount <= 1) return null;
  return <View style={styles.pagination}><Pressable disabled={props.page <= 1} onPress={() => props.setPage(props.page - 1)} style={[styles.pageButton, props.page <= 1 && styles.pageDisabled]}><Text style={styles.pageButtonText}>‹</Text></Pressable><Text style={styles.pageInfo}>Página {props.page} de {props.pageCount}</Text><Pressable disabled={props.page >= props.pageCount} onPress={() => props.setPage(props.page + 1)} style={[styles.pageButton, props.page >= props.pageCount && styles.pageDisabled]}><Text style={styles.pageButtonText}>›</Text></Pressable></View>;
}

const LIGHT_COLORS = { accent: '#382536', accent2: '#CA435F', deep: '#242429', muted: '#7D7E85', faint: '#A8A9AF', canvas: '#F1F2F4', white: '#FFFFFF', line: '#E8E8EB', green: '#E6F3EA', greenText: '#36734B', sidebar: '#222326', sidebarMuted: '#A7A8AD', red: '#A33B47', headerBackground: '#B6B6B8', rowAlt: '#FCFCFD', highlight: '#F6EDF1' };
const DARK_COLORS = { accent: '#493548', accent2: '#E36B83', deep: '#F4EFF4', muted: '#BCB5BF', faint: '#908995', canvas: '#151317', white: '#211E23', line: '#3B353E', green: '#214A32', greenText: '#A0E0B1', sidebar: '#111013', sidebarMuted: '#C5BEC8', red: '#FF9AA4', headerBackground: '#29252B', rowAlt: '#29252B', highlight: '#3C2E3B' };
let colors = LIGHT_COLORS;
const createStyles = () => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas }, desktopSafe: { flexDirection: 'row' }, desktopLayout: { flex: 1, flexDirection: 'row', minHeight: '100vh' },
  sidebar: { width: 220, backgroundColor: colors.sidebar, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12 }, sidebarBrand: { alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#3B3C40', marginBottom: 13 }, sidebarLogo: { width: 140, height: 128 }, sideSection: { color: '#78797E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginHorizontal: 12, marginBottom: 7 }, sideLink: { minHeight: 34, borderRadius: 9, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, marginBottom: 2, gap: 10 }, sideLinkActive: { backgroundColor: '#3B3C41' }, sideIcon: { color: colors.sidebarMuted, fontSize: 16, width: 19, textAlign: 'center' }, sideIconActive: { color: colors.white }, sideText: { color: colors.sidebarMuted, fontWeight: '600', fontSize: 12 }, sideTextActive: { color: colors.white, fontWeight: '800' }, sideSpacer: { flex: 1, minHeight: 20 }, sideUser: { color: '#88898F', fontSize: 11, paddingHorizontal: 12, paddingTop: 10 },
  desktopMain: { flex: 1, minWidth: 0 }, desktopHeader: { minHeight: 66, backgroundColor: colors.headerBackground, paddingHorizontal: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, welcome: { color: colors.deep, fontSize: 19, fontWeight: '700' }, headerDate: { color: colors.muted, fontSize: 12, textTransform: 'capitalize' }, desktopBody: { flex: 1 }, desktopContent: { paddingHorizontal: 30, paddingVertical: 22, maxWidth: 1500, width: '100%', alignSelf: 'center' }, pageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 }, pageTitle: { fontSize: 24, fontWeight: '800', color: colors.deep, marginBottom: 3 }, subtitle: { fontSize: 12, color: colors.muted, marginBottom: 12 }, refreshButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }, refreshText: { color: colors.deep, fontWeight: '700', fontSize: 12 },
  mobileLayout: { flex: 1, minHeight: 0 }, header: { paddingHorizontal: 11, paddingTop: 3, paddingBottom: 3, minHeight: 58, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line }, mobileBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }, mobileGreetingWrap: { flex: 1, minWidth: 0 }, hamburgerButton: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F3F1F3', alignItems: 'center', justifyContent: 'center' }, hamburgerIcon: { color: colors.accent, fontSize: 20, fontWeight: '800', marginTop: -1 }, mobileLogoBadge: { width: 39, height: 39, backgroundColor: colors.sidebar, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, mobileLogo: { width: 36, height: 34 }, greeting: { fontSize: 12, fontWeight: '700', color: colors.deep }, mobileCaption: { marginTop: 2, fontSize: 9, color: colors.muted }, logout: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F0F0F2' }, logoutText: { color: colors.deep, fontWeight: '700', fontSize: 11 }, tabsScroll: { flexGrow: 0, flexShrink: 0, height: 42, backgroundColor: colors.sidebar }, tabs: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, height: 42 }, tab: { flexGrow: 0, flexShrink: 0, minHeight: 30, justifyContent: 'center', borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 }, tabActive: { backgroundColor: '#414247' }, tabText: { fontSize: 11, fontWeight: '600', color: '#C3C4C9' }, tabTextActive: { color: colors.white, fontWeight: '800' }, body: { flex: 1, minHeight: 0 }, content: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 82 }, mobileRefresh: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.white },
  dashboardWelcome: { backgroundColor: colors.white, borderRadius: 13, borderWidth: 1, borderColor: colors.line, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }, dashboardCopy: { flex: 1, minWidth: 0 }, dashboardLogoBadge: { width: 62, height: 56, backgroundColor: colors.sidebar, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, dashboardLogo: { width: 57, height: 52 }, dashEyebrow: { fontSize: 8, fontWeight: '900', color: colors.accent2, letterSpacing: 1, marginBottom: 3 }, dashTitle: { fontSize: 17, fontWeight: '800', color: colors.deep, marginBottom: 2 }, stats: { flexDirection: 'row', gap: 7, marginVertical: 5 }, stat: { flex: 1, borderRadius: 11, backgroundColor: colors.white, padding: 9, borderColor: colors.line, borderWidth: 1, minWidth: 0 }, statValue: { fontWeight: '800', color: colors.deep, fontSize: 21, marginTop: 4 }, statValueSmall: { fontWeight: '800', color: colors.deep, fontSize: 15, marginTop: 4 }, statLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.45 }, statHint: { marginTop: 2, color: colors.muted, fontSize: 9 }, sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.deep, marginTop: 7, marginBottom: 6 }, quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, quick: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 10, padding: 9, minWidth: '46%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, quickIcon: { color: colors.accent2, fontSize: 17, width: 22, textAlign: 'center' }, quickText: { color: colors.deep, fontWeight: '700', fontSize: 11 }, quickSub: { color: colors.muted, fontSize: 8, marginTop: 2 }, quickArrow: { color: colors.faint, fontSize: 19, marginLeft: 'auto' }, muted: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  cashStrip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 17, marginBottom: 14 }, cashCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 17, marginBottom: 14 }, cashValue: { color: colors.deep, fontSize: 18, fontWeight: '800', marginTop: 5, marginBottom: 3 }, cashTotals: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 12 }, cashTotalItem: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, borderRadius: 10, padding: 11 }, cashTotalValue: { color: colors.accent2, fontSize: 17, fontWeight: '900', marginTop: 5 }, cashOpenControl: { minWidth: 200, flexGrow: 1 }, cashHistoryPanel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 13, marginBottom: 14 }, cashHistoryCard: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas, borderRadius: 11, padding: 11, marginTop: 9 }, cashHistoryAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7, marginBottom: 5 }, cashHistoryAmountText: { color: colors.accent2, fontWeight: '800', fontSize: 11 }, tableLabel: { color: colors.muted, fontWeight: '800', fontSize: 9, letterSpacing: 0.8 }, formPanel: { backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 15, padding: 17, marginBottom: 14 }, formRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  tablePanel: { backgroundColor: colors.white, borderRadius: 19, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, borderWidth: 1, borderColor: '#ECECEF' }, tableToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 14, paddingHorizontal: 4, paddingBottom: 13 }, tableTitleWrap: { gap: 3 }, tableTitle: { color: colors.deep, fontWeight: '800', fontSize: 16 }, searchInput: { width: 240, height: 38, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14, fontSize: 12, color: colors.deep }, searchInputMobile: { height: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 13, fontSize: 13, color: colors.deep, marginBottom: 8 }, table: { minWidth: '100%' }, tableHead: { minHeight: 38, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }, tableHeadText: { minWidth: 90, flex: 1, color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, paddingHorizontal: 7 }, tableRow: { minHeight: 47, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEEEF0', gap: 10 }, tableRowAlt: { backgroundColor: colors.rowAlt }, tableCell: { minWidth: 90, flex: 1, color: colors.deep, fontSize: 11, paddingHorizontal: 7 }, firstColumn: { minWidth: 130, color: colors.deep, fontWeight: '700' }, tableStatus: { color: colors.greenText, fontWeight: '700' }, tableStatusRed: { color: '#A8323B', fontWeight: '800' }, tableStatusYellow: { color: '#956600', fontWeight: '800' }, actionCell: { minWidth: 80, alignItems: 'flex-start' }, smallAction: { backgroundColor: '#F5E9ED', borderRadius: 7, paddingHorizontal: 9, paddingVertical: 6 }, smallActionText: { fontSize: 10, fontWeight: '800', color: colors.accent2 }, pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 16 }, pageButton: { minWidth: 30, height: 30, borderRadius: 8, backgroundColor: '#F2F2F4', alignItems: 'center', justifyContent: 'center' }, pageButtonText: { color: colors.deep, fontSize: 18, fontWeight: '700' }, pageDisabled: { opacity: 0.4 }, pageInfo: { color: colors.muted, fontSize: 11 },
  rowCard: { borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 12, marginTop: 7 }, rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, productIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 }, productImage: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#F7EDF0', textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', fontSize: 20 }, productImageSmall: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#F7EDF0', textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', fontSize: 16 }, productTableCell: { minWidth: 130, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 7 }, productTableText: { flex: 1, minWidth: 0, color: colors.deep, fontWeight: '700', fontSize: 11 }, productMapLink: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 3 }, productMapText: { color: colors.accent2, fontSize: 10, fontWeight: '700' }, itemTitle: { flex: 1, color: colors.deep, fontSize: 14, fontWeight: '700' }, itemPrice: { color: colors.accent2, fontWeight: '800', fontSize: 15, marginTop: 6 }, pill: { overflow: 'hidden', backgroundColor: '#F2F2F4', color: colors.muted, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, fontSize: 9, fontWeight: '800' }, pillGreen: { backgroundColor: colors.green, color: colors.greenText }, pillYellow: { backgroundColor: '#FFF1C9', color: '#956600' }, pillRed: { backgroundColor: '#FCE4E5', color: '#A8323B' },
  field: { flex: 1, minWidth: 120, marginBottom: 10 }, fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.deep, marginBottom: 6 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 9, color: colors.deep, backgroundColor: colors.white, fontSize: 14 }, hint: { marginTop: -5, marginBottom: 12, color: colors.muted, fontSize: 11, lineHeight: 16 }, button: { backgroundColor: colors.accent2, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9, marginBottom: 10, paddingHorizontal: 15 }, buttonLoading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, buttonText: { color: colors.white, fontSize: 12, fontWeight: '800' }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.6 }, error: { color: colors.red, fontSize: 12, marginVertical: 8, backgroundColor: '#FDEFF0', padding: 11, borderRadius: 8 }, empty: { alignItems: 'center', padding: 25, backgroundColor: colors.white, borderRadius: 13, marginTop: 10 }, emptyIcon: { fontSize: 26, color: colors.faint }, busyBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 8, backgroundColor: colors.white },
  loginWrap: { flex: 1 }, loginContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 35 }, loginLogoBadge: { width: 270, height: 248, alignSelf: 'center', backgroundColor: colors.sidebar, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, loginLogo: { width: 250, height: 228 }, loginTitle: { color: colors.deep, fontWeight: '800', fontSize: 27, marginTop: 4 }, loginIntro: { color: colors.muted, fontSize: 15, marginTop: 8, marginBottom: 24 }, form: { backgroundColor: colors.white, padding: 18, borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 }, cartButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: '#E8D9DE', backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, cartButtonCompact: { paddingHorizontal: 9, paddingVertical: 6 }, cartIcon: { fontSize: 16 }, cartButtonText: { color: colors.deep, fontSize: 11, fontWeight: '800' },
  productImageBox: { width: 48, height: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, productImageBoxSmall: { width: 34, height: 34, borderRadius: 8 }, productPhoto: { width: '100%', height: '100%' }, productFallback: { fontSize: 23 }, productFallbackSmall: { fontSize: 18 },
  quickSalePanel: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13, marginTop: 10 }, quickSaleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 }, scanButton: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 9, backgroundColor: colors.accent }, scanButtonText: { color: colors.white, fontSize: 10, fontWeight: '800' }, quickSaleRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F2' }, quickSaleInfo: { flex: 1, minWidth: 0 }, quickSaleName: { color: colors.deep, fontSize: 12, fontWeight: '700' }, quickSalePrice: { color: colors.muted, fontSize: 10, marginTop: 3 }, addCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F8E8ED', alignItems: 'center', justifyContent: 'center' }, addCircleText: { color: colors.accent2, fontSize: 21, fontWeight: '700', marginTop: -2 }, addButtonSuccess: { backgroundColor: '#3E8A5A' }, addButtonSuccessText: { color: '#FFFFFF' },
  clientFieldGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 }, cancelButton: { alignItems: 'center', paddingVertical: 9 }, cancelText: { color: colors.muted, fontWeight: '700', fontSize: 11 }, roleToggle: { padding: 10, marginBottom: 9, borderRadius: 8, backgroundColor: '#F4F1F4' }, roleToggleText: { color: colors.accent, fontSize: 11, fontWeight: '800' }, userActions: { justifyContent: 'flex-end', marginTop: 10 }, userActivate: { backgroundColor: '#E8F3EA' }, cashierFilter: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 }, cashierChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 15, backgroundColor: '#F1F1F3', borderWidth: 1, borderColor: colors.line }, cashierChipActive: { backgroundColor: colors.accent, borderColor: colors.accent }, cashierChipText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, cashierChipTextActive: { color: colors.white },
  addButton: { borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.accent2 }, addButtonText: { color: colors.white, fontSize: 10, fontWeight: '800' }, stockActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  cartBar: { position: 'absolute', left: 14, right: 14, bottom: 10, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.accent, shadowColor: '#171217', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 }, cartBarIcon: { fontSize: 20 }, cartBarText: { flex: 1 }, cartBarTitle: { color: colors.white, fontSize: 11, fontWeight: '800' }, cartBarTotal: { color: '#F4DCE3', fontSize: 10, marginTop: 2 }, cartBarAction: { color: colors.white, fontSize: 11, fontWeight: '800' },
  cartPanel: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 14 }, cartPanelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }, cartPanelTotal: { color: colors.accent2, fontWeight: '900', fontSize: 17 }, cartNotice: { color: '#765C17', backgroundColor: '#FFF7DE', fontSize: 10, lineHeight: 15, padding: 9, borderRadius: 8, marginBottom: 5 }, locationButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F5F7', borderWidth: 1, borderColor: '#EEE4E9', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, marginVertical: 5 }, locationIcon: { color: colors.accent2, width: 23, textAlign: 'center', fontSize: 18, fontWeight: '800' }, locationCopy: { flex: 1 }, locationTitle: { color: colors.deep, fontSize: 11, fontWeight: '800' }, locationSubtitle: { color: colors.muted, fontSize: 9, marginTop: 2 }, locationArrow: { color: colors.accent2, fontSize: 20, fontWeight: '700' }, cartLine: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F0F0F2' }, cartLineInfo: { flex: 1, minWidth: 0 }, quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 7 }, quantityButton: { width: 27, height: 27, borderRadius: 8, backgroundColor: '#F2F2F4', alignItems: 'center', justifyContent: 'center' }, quantityButtonText: { color: colors.deep, fontSize: 16, fontWeight: '800', lineHeight: 19 }, quantityValue: { minWidth: 14, textAlign: 'center', color: colors.deep, fontSize: 12, fontWeight: '800' }, removeLine: { width: 20, alignItems: 'center', justifyContent: 'center' }, removeLineText: { color: colors.red, fontSize: 19 }, cartEmpty: { color: colors.muted, fontSize: 11, paddingVertical: 12 },
  drawerRoot: { flex: 1, flexDirection: 'row' }, drawerScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22,18,24,0.48)' }, drawerPanel: { width: '82%', maxWidth: 330, height: '100%', backgroundColor: colors.white, paddingTop: Platform.OS === 'ios' ? 52 : 28, paddingBottom: 18, paddingHorizontal: 16, borderTopRightRadius: 20, borderBottomRightRadius: 20, elevation: 18, shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 5, height: 0 } }, drawerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.line }, drawerLogo: { width: 47, height: 47, backgroundColor: colors.sidebar, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, drawerLogoImage: { width: 43, height: 40 }, drawerUser: { flex: 1, minWidth: 0 }, drawerName: { fontSize: 13, fontWeight: '800', color: colors.deep }, drawerRole: { marginTop: 3, color: colors.muted, fontSize: 10 }, drawerClose: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F1F3' }, drawerCloseText: { fontSize: 23, lineHeight: 25, color: colors.muted }, drawerSection: { color: colors.faint, fontWeight: '900', fontSize: 9, letterSpacing: 1.1, marginTop: 23, marginBottom: 8, paddingHorizontal: 9 }, drawerLinks: { gap: 4, paddingBottom: 15 }, drawerLink: { minHeight: 46, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 12 }, drawerLinkActive: { backgroundColor: colors.highlight }, drawerLinkIcon: { width: 22, textAlign: 'center', color: colors.muted, fontSize: 18 }, drawerLinkText: { color: '#5B5860', fontSize: 13, fontWeight: '700' }, drawerLinkActiveText: { color: colors.accent2, fontWeight: '800' }, drawerActiveMark: { marginLeft: 'auto', width: 5, height: 20, borderRadius: 3, backgroundColor: colors.accent2 }, drawerSignOut: { marginTop: 'auto', minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 11, borderTopWidth: 1, borderTopColor: colors.line }, drawerSignOutIcon: { color: colors.red, fontSize: 18 }, drawerSignOutText: { color: colors.red, fontWeight: '800', fontSize: 12 },
  scannerPage: { flex: 1, backgroundColor: '#19171A' }, scannerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: Platform.OS === 'ios' ? 48 : 16, paddingBottom: 15, paddingHorizontal: 16 }, scannerClose: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#343136', alignItems: 'center', justifyContent: 'center' }, scannerCloseText: { color: colors.white, fontSize: 30, lineHeight: 32, marginTop: -2 }, scannerTitle: { color: colors.white, fontSize: 16, fontWeight: '800' }, scannerSubtitle: { color: '#C2BBC3', fontSize: 11, marginTop: 3 }, cameraFrame: { flex: 1, marginHorizontal: 14, marginBottom: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#252226' }, viewfinderWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' }, viewfinder: { width: 270, height: 170 }, viewfinderCorner: { position: 'absolute', width: 27, height: 27, borderColor: '#FFFFFF', borderWidth: 3 }, cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 }, cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 }, cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 }, cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 }, viewfinderCaption: { color: colors.white, backgroundColor: 'rgba(20,18,20,0.65)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, overflow: 'hidden', marginTop: 18, fontSize: 11, fontWeight: '600' }, scannerPermission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }, scannerPermissionText: { color: colors.white, textAlign: 'center', fontSize: 14, lineHeight: 21, marginBottom: 18 }, scannerPermissionButton: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.accent2 }, scannerPermissionButtonText: { color: colors.white, fontWeight: '800', fontSize: 12 }, scannerFooter: { paddingHorizontal: 25, paddingTop: 7, paddingBottom: Platform.OS === 'ios' ? 28 : 18, alignItems: 'center' }, scannerFooterText: { color: '#C2BBC3', textAlign: 'center', fontSize: 10, lineHeight: 15 },
  productModalTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 13, padding: 12, marginBottom: 12 },
  productModalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 }, productModalScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15,12,17,0.62)' }, productModalKeyboard: { width: '100%', maxHeight: '94%', alignItems: 'center', justifyContent: 'center' }, productModalCard: { width: '100%', maxWidth: 680, maxHeight: '100%', borderRadius: 19, overflow: 'hidden', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, elevation: 18, shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }, productModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 17, paddingBottom: 10, backgroundColor: colors.white }, productModalContent: { paddingHorizontal: 12, paddingBottom: 8 }, productCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, productCodeField: { flex: 1, minWidth: 0 }, scanProductCode: { backgroundColor: colors.accent, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 12, marginBottom: 10 }, productLocationButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 10, marginBottom: 12 }, themeToggle: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 11, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  loginThemeToggle: { alignSelf: 'flex-end', marginTop: -18, marginBottom: 14, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }, loginThemeToggleText: { color: colors.accent2, fontSize: 11, fontWeight: '800' },
});
let styles = createStyles();






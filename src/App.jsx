import { useState } from 'react';

// ==========================================
// 1. COMPONENTE SIDEBAR (Menú Lateral Minimalista)
// ==========================================
function Sidebar({ activeSection, setActiveSection }) {
  const menuItems = [
    { name: 'Dashboard', icon: '🏠', id: 'dashboard' },
    { name: 'Inventario', icon: '📦', id: 'inventario' },
    { name: 'Nueva Venta', icon: '🛒', id: 'ventas' },
    { name: 'Clientes', icon: '👥', id: 'clientes' },
    { name: 'Reportes', icon: '📈', id: 'reportes' },
    { name: 'Configuración', icon: '⚙️', id: 'configuracion' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800">
      {/* Logo exclusivo arriba en el Sidebar */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-center">
        <img 
          src="/logo_pintu.png" 
          alt="Logo Pinturería" 
          className="h-20 object-contain" 
        />
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
              activeSection === item.id 
                ? 'bg-slate-800 text-white font-semibold border-l-4 border-slate-200' 
                : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.0.0 - Control Interno
      </div>
    </aside>
  );
}

// ==========================================
// 2. COMPONENTE MAIN LAYOUT (Estructura Principal)
// ==========================================
function MainLayout({ onLogout }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            Sección: {activeSection}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                A
              </div>
              <span className="text-sm font-medium text-slate-700">Hola, Ana</span>
            </div>
            
            {/* Botón de Cerrar Sesión en tono gris sobrio */}
            <button 
              onClick={onLogout}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Área de Contenido Dinámico */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2 capitalize">Vista de {activeSection}</h3>
              <p className="text-slate-600">
                Acá es donde vas a programar los componentes específicos de cada pantalla (como la tabla de inventario o la caja de ventas que diseñamos en los mockups).
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ==========================================
// 3. COMPONENTE PRINCIPAL APP (Login Sobrio y Limpio)
// ==========================================
export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor, completá todos los campos.');
      return;
    }

    if (email === "admin@pintureria.com" && password === "1234") {
      setIsLoggedIn(true);
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'Error al iniciar sesión');
      }

      localStorage.setItem('token_pintureria', datos.token);
      setIsLoggedIn(true);

    } catch (err) {
      setError('Credenciales incorrectas o servidor desconectado. (Probá con admin@pintureria.com / 1234)');
    } finally {
      setCargando(false);
    }
  };

  if (isLoggedIn) {
    return <MainLayout onLogout={() => setIsLoggedIn(false)} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 px-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-xl border border-slate-100">
        
        {/* Logo y Encabezado */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <img 
            src="/logo_pintu.png" 
            alt="Logo Pinturería" 
            className="w-14 h-14 object-contain mb-1" 
          />
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sistema de Gestión</h2>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Pinturería - Acceso Interno</p>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">✉️</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@pintureria.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contraseña</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">🔒</span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 hover:text-slate-800 focus:outline-none flex items-center gap-1 bg-white/80 px-1.5 py-0.5 rounded"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => alert("Función de recuperación en desarrollo.")}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-all duration-200 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {cargando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

      </div>
    </div>
  );
}
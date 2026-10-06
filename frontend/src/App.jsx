import { useState } from 'react';
import MainLayout from './components/MainLayout';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ShieldCheck, Paintbrush } from 'lucide-react';

export default function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Estados para el Login normal del sistema
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');

  // 🔒 ESTADOS: Para verificar al Admin antes de dejarlo registrar
  const [isAdminVerifiedForRegister, setIsAdminVerifiedForRegister] = useState(false);
  const [adminCheckEmail, setAdminCheckEmail] = useState('');
  const [adminCheckPassword, setAdminCheckPassword] = useState('');

  // Estados para el formulario de registro del nuevo empleado
  const [nombreReg, setNombreReg] = useState('');
  const [emailReg, setEmailReg] = useState('');
  const [passwordReg, setPasswordReg] = useState('');
  const [confirmPasswordReg, setConfirmPasswordReg] = useState('');

  // 1. Login normal al sistema (para entrar a MainLayout)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!emailLogin || !passwordLogin) {
      setError('Por favor, completá todos los campos de acceso.');
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, password: passwordLogin }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.message || 'Error al iniciar sesión');

      localStorage.setItem('token_pintureria', datos.access_token);
      setIsLoggedIn(true);
    } catch (err) {
      setError('Credenciales incorrectas o servidor desconectado.');
    } finally {
      setCargando(false);
    }
  };

  // 2. Verificación previa del Admin antes de habilitar el registro
  const handleVerifyAdminForRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!adminCheckEmail || !adminCheckPassword) {
      setError('Ingresá las credenciales de administrador.');
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminCheckEmail, password: adminCheckPassword }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error('Credenciales de administrador inválidas.');

      // Guardamos temporalmente el token del admin verificado para usarlo en el registro
      localStorage.setItem('token_pintureria', datos.access_token);
      setIsAdminVerifiedForRegister(true); // ¡Listo! Ahora se desbloquea el formulario de registro
      setError('');
    } catch (err) {
      setError(err.message || 'Error al verificar administrador.');
    } finally {
      setCargando(false);
    }
  };

  // 3. Registro final del empleado (enviando el token del Admin)
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!nombreReg || !emailReg || !passwordReg || !confirmPasswordReg) {
      setError('Por favor, completá todos los campos de registro.');
      return;
    }

    if (passwordReg !== confirmPasswordReg) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const tokenAdmin = localStorage.getItem('token_pintureria');

    if (!tokenAdmin) {
      setError('Sesión expirada. Vuelve a verificar al administrador.');
      setIsAdminVerifiedForRegister(false);
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}` 
        },
        body: JSON.stringify({
          nombre: nombreReg,
          email: emailReg,
          password: passwordReg,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.message || 'Error al registrar usuario');

      alert(`¡Cuenta creada con éxito para ${nombreReg}!`);
      setIsFlipped(false); // Vuelve al login principal
      setIsAdminVerifiedForRegister(false); // Reseteamos la validación
      
      // Limpieza exhaustiva de credenciales de admin e inputs de registro
      setAdminCheckEmail('');
      setAdminCheckPassword('');
      setShowAdminPassword(false);
      setNombreReg('');
      setEmailReg('');
      setPasswordReg('');
      setConfirmPasswordReg('');
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  if (isLoggedIn) {
    return <MainLayout onLogout={() => setIsLoggedIn(false)} />;
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-950 px-4">
      
      {/* Fondo estético */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/30 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/25 rounded-full blur-[140px] pointer-events-none"></div>

      {/* Contenedor 3D */}
      <div className="w-full max-w-md perspective-1000 z-10">
        <div className={`relative w-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* ================= CARA 1: LOGIN PRINCIPAL ================= */}
          <div className="w-full bg-slate-900/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 backface-hidden text-slate-100 flex flex-col justify-between min-h-[520px]">
            <div>
              <div className="flex flex-col items-center justify-center space-y-2 mb-6">
                <div className="p-2.5 bg-slate-950/60 border border-slate-700/60 rounded-2xl shadow-lg mb-1 flex items-center justify-center">
                  <img src="/logo_pintu.png" alt="Logo" className="w-12 h-12 object-contain" />
                </div>
                <h2 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  PINTURERÍA
                </h2>
                <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Sistema de Gestión Interna</p>
              </div>

              {error && !isFlipped && (
                <div className="p-3 mb-4 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Mail className="w-4 h-4" /></span>
                    <input
                      type="email"
                      value={emailLogin}
                      onChange={(e) => setEmailLogin(e.target.value)}
                      placeholder="empleado@pintureria.com"
                      className="w-full pl-10 pr-3.5 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><Lock className="w-4 h-4" /></span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordLogin}
                      onChange={(e) => setPasswordLogin(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-16 py-3 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded-lg"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => { setIsFlipped(true); setError(''); }}
                    className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    ¿Registrar nuevo empleado?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-3 font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2 text-sm"
                >
                  <LogIn className="w-4 h-4" />
                  {cargando ? 'Verificando...' : 'Ingresar al Sistema'}
                </button>
              </form>
            </div>

            {/* Pie de página - Cara 1 */}
            <div className="pt-6 mt-4 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 tracking-wider">© 2026 Pintu. Todos los derechos reservados.</p>
            </div>
          </div>

          {/* ================= CARA 2: DORSO (VALIDACIÓN ADMIN + REGISTRO) ================= */}
          <div className="absolute inset-0 w-full bg-slate-900/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 backface-hidden rotate-y-180 text-slate-100 flex flex-col justify-between overflow-y-auto">
            
            {!isAdminVerifiedForRegister ? (
              /* --- PASO A: PEDIR CREDENCIALES DE ADMIN ANTES DE DEJAR REGISTRAR --- */
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex flex-col items-center justify-center space-y-1 mb-4">
                    <ShieldCheck className="w-10 h-10 text-cyan-400 mb-1" />
                    <h2 className="text-lg font-black tracking-wider text-white">ÁREA RESTRINGIDA</h2>
                    <p className="text-xs text-slate-400 text-center">Ingrese las credenciales del Administrador para autorizar el alta</p>
                  </div>

                  {error && isFlipped && (
                    <div className="p-2 mb-3 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleVerifyAdminForRegister} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email de Admin</label>
                      <input
                        type="email"
                        value={adminCheckEmail}
                        onChange={(e) => setAdminCheckEmail(e.target.value)}
                        placeholder="example@gmail.com"
                        autoComplete="off"
                        name="admin-email-secure"
                        className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña de Admin</label>
                      <div className="relative">
                        <input
                          type={showAdminPassword ? "text" : "password"}
                          value={adminCheckPassword}
                          onChange={(e) => setAdminCheckPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          name="admin-pass-secure"
                          className="w-full px-3.5 pr-16 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded-lg"
                        >
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => { 
                          setIsFlipped(false); 
                          setAdminCheckEmail(''); 
                          setAdminCheckPassword(''); 
                          setShowAdminPassword(false);
                          setError(''); 
                        }}
                        className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Paintbrush className="w-3.5 h-3.5" />
                        Volver al login
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={cargando}
                      className="w-full py-2.5 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2 text-sm"
                    >
                      {cargando ? 'Validando...' : 'Autorizar y Continuar'}
                    </button>
                  </form>
                </div>

                {/* Pie de página - Validación de Admin */}
                <div className="pt-4 mt-2 border-t border-slate-800/80 text-center">
                  <p className="text-[11px] text-slate-500 tracking-wider">© 2026 Pintu. Todos los derechos reservados.</p>
                </div>
              </div>
            ) : (
              /* --- PASO B: FORMULARIO DE REGISTRO DEL EMPLEADO (Ya verificado el admin) --- */
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex flex-col items-center justify-center space-y-1 mb-3">
                    <h2 className="text-xl font-black tracking-wider text-white">CREAR CUENTA</h2>
                    <p className="text-xs text-slate-400 font-medium">Complete los datos del nuevo empleado</p>
                  </div>

                  {error && isFlipped && (
                    <div className="p-2 mb-2 text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/60 rounded-xl text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={nombreReg}
                        onChange={(e) => setNombreReg(e.target.value)}
                        placeholder="Juan Pérez"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={emailReg}
                        onChange={(e) => setEmailReg(e.target.value)}
                        placeholder="empleado@pintureria.com"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contraseña</label>
                      <input
                        type="password"
                        value={passwordReg}
                        onChange={(e) => setPasswordReg(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Repetir Contraseña</label>
                      <input
                        type="password"
                        value={confirmPasswordReg}
                        onChange={(e) => setConfirmPasswordReg(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => { 
                          setIsFlipped(false); 
                          setIsAdminVerifiedForRegister(false); 
                          setAdminCheckEmail(''); 
                          setAdminCheckPassword(''); 
                          setShowAdminPassword(false);
                          setError(''); 
                        }}
                        className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Paintbrush className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={cargando}
                      className="w-full py-2.5 font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm mt-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      {cargando ? 'Registrando...' : 'Registrar Empleado'}
                    </button>
                  </form>
                </div>

                {/* Pie de página - Registro de Empleado */}
                <div className="pt-3 mt-1 border-t border-slate-800/80 text-center">
                  <p className="text-[11px] text-slate-500 tracking-wider">© 2026 Pintu. Todos los derechos reservados.</p>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
//menú lateral://

export default function Sidebar({ activeSection, setActiveSection }) {
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
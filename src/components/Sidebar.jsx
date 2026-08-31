import React from 'react';

export default function Sidebar({ setActiveSection }) {
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
      {/* Logo / Título */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-wide">
          Pinturería <span className="text-amber-500">El Pincel</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Sistema Interno</p>
      </div>

      {/* Menú de navegación */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-slate-800 hover:text-white group text-left"
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Pie del Sidebar */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.0.0 - Control Interno
      </div>
    </aside>
  );
}
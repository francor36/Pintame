import React, { useState } from 'react';
import Sidebar from './Sidebar';

export default function MainLayout({ children }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Barra lateral */}
      <Sidebar setActiveSection={setActiveSection} />

      {/* Contenedor derecho (Header + Contenido) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {activeSection}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                A
              </div>
              <span className="text-sm font-medium text-slate-700">Hola, Ana</span>
            </div>
            
            <button 
              onClick={() => alert('Cerrar sesión')}
              className="text-sm text-red-600 hover:text-red-800 font-medium px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Área de Contenido Dinámico */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {/* Acá se van a cargar tus pantallas (Inventario, Ventas, etc.) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Sección: {activeSection}</h3>
              <p className="text-slate-600">Acá es donde va a ir la tabla o el contenido correspondiente a esta vista.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
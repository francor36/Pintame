//estructura principal con el header y el área de contenido//

import { useState } from 'react';
import Sidebar from './Sidebar';

export default function MainLayout({ onLogout }) {
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
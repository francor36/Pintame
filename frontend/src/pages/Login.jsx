import { useState } from 'react';

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Determinar la ruta según si está registrándose o iniciando sesión
    const endpoint = isRegistering 
      ? 'http://localhost:3000/auth/register' 
      : 'http://localhost:3000/auth/login';

    const payload = isRegistering 
      ? { nombre, email, password } 
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegistering) {
          alert('¡Cuenta creada con éxito! Ahora puedes iniciar sesión.');
          setIsRegistering(false); // Cambiar a la vista de login
        } else {
          alert('¡Inicio de sesión exitoso!');
          // Aquí puedes guardar el token o redirigir al dashboard
        }
      } else {
        alert('Error: ' + (data.message || 'Ocurrió un error'));
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('No se pudo conectar con el servidor en el puerto 3000.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', background: '#0f172a', color: '#fff', borderRadius: '8px' }}>
      <h2>{isRegistering ? 'Registro de Usuario' : 'Iniciar Sesión'}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {isRegistering && (
          <div>
            <label>Nombre</label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
        )}

        <div>
          <label>Correo Electrónico</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Contraseña</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          {isRegistering ? 'Registrarse' : 'Ingresar al Sistema'}
        </button>
      </form>

      <p style={{ marginTop: '15px', textAlign: 'center', cursor: 'pointer', color: '#38bdf8' }} onClick={() => setIsRegistering(!isRegistering)}>
        {isRegistering ? '¿Ya tenés cuenta? Inicia sesión' : '¿No tenés cuenta? Registrate'}
      </p>
    </div>
  );
}
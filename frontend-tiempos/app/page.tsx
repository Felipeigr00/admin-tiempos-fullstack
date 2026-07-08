"use client";

import { useEffect, useState } from "react";
import { 
  SignInButton, 
  SignedIn, 
  SignedOut, 
  UserButton, 
  useAuth 
} from '@clerk/nextjs';

interface Objetivo {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_objetivo: string;
  estado: string;
  usuario_id?: string; // NUEVO: El modelo ahora acepta al dueño
}

export default function Home() {
  const [objetivos, setObjetivos] = useState<Objetivo[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [vista, setVista] = useState("tablero"); 
  const [fechaCalendario, setFechaCalendario] = useState(new Date());
  const [recomendacion, setRecomendacion] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [estadoEditando, setEstadoEditando] = useState("Pendiente");

  // NUEVO: Extraemos el ID inquebrantable del usuario directamente de Clerk
  const { userId, isLoaded } = useAuth(); 

  const cargarObjetivos = () => {
    if (!userId) return; // Si no hay usuario logueado, no hace peticiones

    // NUEVO: Le pedimos a tu API solo las tareas de este usuario
    fetch(`https://api-tiempos.onrender.com/objetivos/usuario/${userId}`)
      .then((res) => res.json())
      .then((data) => setObjetivos(data))
      .catch((err) => console.error("Error al cargar objetivos:", err));
  };

  const cargarRecomendacion = () => {
    fetch("https://api-tiempos.onrender.com/recomendacion-del-dia/")
      .then((res) => res.json())
      .then((data) => setRecomendacion(data.texto))
      .catch((err) => console.error("Error al cargar recomendación:", err));
  };

  // NUEVO: El useEffect ahora "escucha" hasta que Clerk termine de cargar al usuario
  useEffect(() => {
    if (isLoaded && userId) {
      cargarObjetivos();
      cargarRecomendacion(); 
    }
  }, [isLoaded, userId]);

  const iniciarEdicion = (obj: Objetivo) => {
    setTitulo(obj.titulo);
    setDescripcion(obj.descripcion);
    setFecha(obj.fecha_objetivo);
    setEstadoEditando(obj.estado);
    setEditandoId(obj.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelarEdicion = () => {
    setTitulo(""); setDescripcion(""); setFecha("");
    setEstadoEditando("Pendiente");
    setEditandoId(null);
  };

  const guardarObjetivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoId) {
      const objActualizado = { titulo, descripcion, fecha_objetivo: fecha, estado: estadoEditando };
      try {
        const res = await fetch(`https://api-tiempos.onrender.com/objetivos/${editandoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(objActualizado),
        });
        if (res.ok) {
          cancelarEdicion();
          cargarObjetivos();
        }
      } catch (error) { console.error("Error al actualizar:", error); }
    } else {
      // NUEVO: Al crear una tarea, le pegamos tu ID como si fuera una etiqueta
      const nuevoObjetivo = { 
        titulo, 
        descripcion, 
        fecha_objetivo: fecha, 
        estado: "Pendiente",
        usuario_id: userId 
      };
      try {
        const res = await fetch("https://api-tiempos.onrender.com/objetivos/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoObjetivo),
        });
        if (res.ok) {
          setTitulo(""); setDescripcion(""); setFecha("");
          cargarObjetivos();
        }
      } catch (error) { console.error("Error al crear:", error); }
    }
  };

  const eliminarObjetivo = async (id: number) => {
    try {
      const res = await fetch(`https://api-tiempos.onrender.com/objetivos/${id}`, { method: "DELETE" });
      if (res.ok) cargarObjetivos();
    } catch (error) { console.error("Error al eliminar:", error); }
  };

  const avanzarEstado = async (objetivo: Objetivo) => {
    let nuevoEstado = "";
    if (objetivo.estado === "Pendiente") nuevoEstado = "En Progreso";
    else if (objetivo.estado === "En Progreso") nuevoEstado = "Completado";
    else return; 
    const objActualizado = { ...objetivo, estado: nuevoEstado };
    try {
      const res = await fetch(`https://api-tiempos.onrender.com/objetivos/${objetivo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(objActualizado),
      });
      if (res.ok) cargarObjetivos();
    } catch (error) { console.error("Error al avanzar:", error); }
  };

  const archivarCompletados = async () => {
    const tareasCompletadas = objetivos.filter((obj) => obj.estado === "Completado");
    if (tareasCompletadas.length === 0) return; 

    try {
      await Promise.all(
        tareasCompletadas.map((obj) => {
          const objActualizado = { ...obj, estado: "Archivado" };
          return fetch(`https://api-tiempos.onrender.com/objetivos/${obj.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(objActualizado),
          });
        })
      );
      cargarObjetivos();
    } catch (error) {
      console.error("Error al archivar las tareas:", error);
    }
  };

  const anio = fechaCalendario.getFullYear();
  const mes = fechaCalendario.getMonth();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  let primerDiaDelMes = new Date(anio, mes, 1).getDay();
  primerDiaDelMes = primerDiaDelMes === 0 ? 6 : primerDiaDelMes - 1;
  const mesNombre = fechaCalendario.toLocaleString('es-ES', { month: 'long' });

  const cambiarMes = (direccion: number) => {
    setFechaCalendario(new Date(anio, mes + direccion, 1));
  };

  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const calcularRacha = () => {
    const completados = objetivos.filter(obj => obj.estado === "Completado" || obj.estado === "Archivado");
    const fechasCompletadas = [...new Set(completados.map(obj => obj.fecha_objetivo))].sort().reverse();
    let racha = 0;
    let fechaEvaluar = new Date(hoy);
    
    while (true) {
      const fechaStr = `${fechaEvaluar.getFullYear()}-${String(fechaEvaluar.getMonth() + 1).padStart(2, '0')}-${String(fechaEvaluar.getDate()).padStart(2, '0')}`;
      if (fechasCompletadas.includes(fechaStr)) {
        racha++;
        fechaEvaluar.setDate(fechaEvaluar.getDate() - 1);
      } else {
        if (racha === 0 && fechaStr === hoyStr) {
          fechaEvaluar.setDate(fechaEvaluar.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return racha;
  };

  const objetivosHoy = objetivos.filter(obj => obj.fecha_objetivo === hoyStr);
  const completadosHoy = objetivosHoy.filter(obj => obj.estado === "Completado" || obj.estado === "Archivado").length;
  const totalHoy = objetivosHoy.length;
  const metaDiaria = Math.max(4, totalHoy); 
  const porcentajeHoy = Math.min(100, Math.round((completadosHoy / metaDiaria) * 100));
  const totalHistorico = objetivos.filter(obj => obj.estado === "Completado" || obj.estado === "Archivado").length;

  const renderizarCalendario = () => {
    const dias = [];
    for (let i = 0; i < primerDiaDelMes; i++) {
      dias.push(<div key={`empty-${i}`} className="min-h-[100px] bg-transparent p-2 border border-transparent"></div>);
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const objsDelDia = objetivos.filter(o => o.fecha_objetivo === fechaStr);
      const esHoy = fechaStr === hoyStr;

      dias.push(
        <div key={dia} className={`min-h-[120px] p-2 border rounded-xl flex flex-col transition duration-300 ${esHoy ? 'bg-purple-900/20 border-purple-500/50' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-800/50'}`}>
          <span className={`font-bold text-right text-sm mb-2 ${esHoy ? 'text-purple-400' : 'text-gray-500'}`}>{dia}</span>
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
            {objsDelDia.map(obj => (
               <div key={obj.id} className={`text-[11px] p-2 rounded-lg font-medium truncate border border-opacity-20 ${
                 (obj.estado === "Completado" || obj.estado === "Archivado") ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                 obj.estado === "En Progreso" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                 "bg-rose-500/10 text-rose-400 border-rose-500/30"
               }`}>
                 {obj.titulo}
               </div>
            ))}
          </div>
        </div>
      );
    }
    return dias;
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-8 text-gray-300 font-sans selection:bg-purple-500/30 pb-20">
      
      <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 tracking-tight">
          Administrador de Tiempos
        </h1>
        
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-purple-600/90 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(147,51,234,0.3)] border border-purple-500/50">
                Iniciar Sesión
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-12 h-12 border-2 border-purple-500/50" } }} />
          </SignedIn>
        </div>
      </div>

      <SignedOut>
        <div className="flex flex-col items-center justify-center mt-20 p-10 bg-[#121212] rounded-3xl border border-gray-800/50 max-w-2xl mx-auto shadow-2xl text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          
          <div className="text-6xl mb-6 relative z-10">🔐</div>
          <h2 className="text-3xl font-black text-gray-200 mb-4 relative z-10">Acceso Privado</h2>
          <p className="text-gray-400 mb-8 text-lg relative z-10">
            Inicia sesión para acceder a tu tablero personal. Tus objetivos, rachas y estadísticas estarán guardados de forma segura en la nube.
          </p>
          <SignInButton mode="modal">
            <button className="relative z-10 bg-gray-100 text-gray-900 hover:bg-white font-black py-3 px-8 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-10">
          
          <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 shadow-lg flex items-center gap-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
            <div className="text-5xl">🔥</div>
            <div>
              <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-1">Racha</p>
              <p className="text-4xl font-black text-gray-100">{calcularRacha()} <span className="text-lg text-gray-500 font-medium tracking-normal">días</span></p>
            </div>
          </div>

          <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 shadow-lg relative overflow-hidden flex flex-col justify-center">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-1">Hoy</p>
                <p className="text-2xl font-black text-gray-100">{completadosHoy} <span className="text-sm text-gray-500 font-medium">/ {metaDiaria}</span></p>
              </div>
              <p className="text-purple-400 font-bold">{porcentajeHoy}%</p>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${porcentajeHoy}%` }}></div>
            </div>
          </div>

          <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 shadow-lg flex items-center gap-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="text-5xl">🏆</div>
            <div>
              <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-1">Total</p>
              <p className="text-4xl font-black text-gray-100">{totalHistorico} <span className="text-lg text-gray-500 font-medium tracking-normal">obj</span></p>
            </div>
          </div>

          <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 shadow-lg flex items-center gap-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="text-4xl">💡</div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Sugerencia</p>
              <p className="text-sm font-medium text-gray-300 leading-tight">{recomendacion || "Cargando..."}</p>
            </div>
          </div>

        </div>

        <div className="flex justify-center gap-4 mb-10">
          <button onClick={() => setVista("tablero")} className={`px-6 py-2 rounded-full font-bold transition-all duration-300 border ${vista === "tablero" ? "bg-purple-500/10 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-transparent text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700"}`}>Tablero Kanban</button>
          <button onClick={() => setVista("calendario")} className={`px-6 py-2 rounded-full font-bold transition-all duration-300 border ${vista === "calendario" ? "bg-purple-500/10 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" : "bg-transparent text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700"}`}>Vista Mensual</button>
        </div>

        <div className={`p-6 rounded-2xl mb-10 border max-w-7xl mx-auto shadow-2xl relative z-10 transition-colors duration-300 ${editandoId ? "bg-purple-900/10 border-purple-500/50" : "bg-[#121212] border-gray-800/50"}`}>
          <div className="flex justify-between items-center mb-5">
            <h2 className={`font-bold text-sm uppercase tracking-widest ${editandoId ? "text-purple-400" : "text-gray-500"}`}>
              {editandoId ? "Editando Objetivo..." : "Nuevo Objetivo"}
            </h2>
            {editandoId && (
              <button type="button" onClick={cancelarEdicion} className="text-xs text-rose-400 hover:text-rose-300 font-bold">
                ✕ Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={guardarObjetivo} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Título (ej. Estudiar AWS)" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 p-3 bg-black/40 border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition" />
            <input type="text" placeholder="Descripción breve..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="flex-1 p-3 bg-black/40 border border-gray-800 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition" />
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className="p-3 bg-black/40 border border-gray-800 rounded-xl text-gray-400 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition" style={{ colorScheme: 'dark' }} />
            <button type="submit" className={`${editandoId ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-purple-600/90 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)]"} text-white font-bold py-3 px-8 rounded-xl transition duration-300`}>
              {editandoId ? "Actualizar" : "Guardar"}
            </button>
          </form>
        </div>

        {vista === "tablero" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Pendientes */}
            <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 flex flex-col gap-4 relative">
              <h2 className="font-black text-lg text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span> Pendientes
              </h2>
              {objetivos.filter(obj => obj.estado === "Pendiente").map(obj => (
                <div key={obj.id} className="bg-black/40 p-5 rounded-xl border border-rose-900/30 flex flex-col group hover:border-rose-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/5">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-200">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-800/50">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                    <button onClick={() => avanzarEstado(obj)} className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition font-bold">Avanzar →</button>
                  </div>
                </div>
              ))}
            </div>

            {/* En Progreso */}
            <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 flex flex-col gap-4 relative">
              <h2 className="font-black text-lg text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span> En Progreso
              </h2>
              {objetivos.filter(obj => obj.estado === "En Progreso").map(obj => (
                <div key={obj.id} className="bg-black/40 p-5 rounded-xl border border-purple-900/30 flex flex-col group hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-200">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-800/50">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                    <button onClick={() => avanzarEstado(obj)} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition font-bold">Completar ✓</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Completados */}
            <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800/50 flex flex-col gap-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-black text-lg text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> Completados
                </h2>
                <button 
                  onClick={archivarCompletados} 
                  className="text-xs font-bold text-gray-500 hover:text-emerald-400 bg-gray-800/30 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-gray-800 hover:border-emerald-500/30 transition-all duration-300"
                >
                  🧹 Limpiar
                </button>
              </div>
              {objetivos.filter(obj => obj.estado === "Completado").map(obj => (
                <div key={obj.id} className="bg-black/40 p-5 rounded-xl border border-emerald-900/30 flex flex-col opacity-80 group hover:opacity-100 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-300 line-through decoration-emerald-500/50">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-800/50">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto bg-[#121212] p-8 rounded-2xl border border-gray-800/50 shadow-2xl relative">
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => cambiarMes(-1)} className="bg-black/50 text-gray-400 border border-gray-800 px-5 py-2.5 rounded-xl font-bold hover:text-purple-400 hover:border-purple-500/30 transition">← Anterior</button>
              <h2 className="text-2xl font-black text-gray-200 capitalize tracking-wider">{mesNombre} <span className="text-purple-500">{anio}</span></h2>
              <button onClick={() => cambiarMes(1)} className="bg-black/50 text-gray-400 border border-gray-800 px-5 py-2.5 rounded-xl font-bold hover:text-purple-400 hover:border-purple-500/30 transition">Siguiente →</button>
            </div>
            <div className="grid grid-cols-7 gap-3 mb-4 text-center font-bold text-gray-600 uppercase text-xs tracking-widest">
              <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
            </div>
            <div className="grid grid-cols-7 gap-3">
              {renderizarCalendario()}
            </div>
          </div>
        )}
      </SignedIn>
    </main>
  );
}
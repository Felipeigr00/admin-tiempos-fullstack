"use client";

import { SignInButton, UserButton, useAuth, Show } from '@clerk/nextjs';
import { useState, useEffect } from "react";
import { Flame, Trophy, Lightbulb, Lock, Pencil, Eraser } from "lucide-react";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale/es";

// Registramos el idioma español para los días y meses
registerLocale("es", es);

interface Objetivo {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_objetivo: string;
  estado: string;
  usuario_id?: string;
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

  const { userId, isLoaded } = useAuth(); 

  const cargarObjetivos = () => {
    if (!userId) return; 
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

    if (!isLoaded || !userId) {
      alert("Tu sesión aún se está cargando, espera un segundo e intenta de nuevo.");
      return;
    }

    if (editandoId) {
      const objActualizado = { 
        titulo, 
        descripcion, 
        fecha_objetivo: fecha, 
        estado: estadoEditando,
        usuario_id: userId 
      };
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

  // ¡BUG FIX SOLUCIONADO AQUÍ!
  const eliminarObjetivo = async (id: number) => {
    try {
      const res = await fetch(`https://api-tiempos.onrender.com/objetivos/${id}`, { method: "DELETE" });
      if (res.ok) {
        cargarObjetivos();
        // Si borramos el objetivo que estamos editando, limpiamos el formulario
        if (editandoId === id) {
          cancelarEdicion();
        }
      }
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
    // Días vacíos al inicio del mes
    for (let i = 0; i < primerDiaDelMes; i++) {
      dias.push(<div key={`empty-${i}`} className="min-h-[120px] bg-black/20 rounded-xl border border-white/5 opacity-40"></div>);
    }
    
    // Días reales del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const objsDelDia = objetivos.filter(o => o.fecha_objetivo === fechaStr);
      const esHoy = fechaStr === hoyStr;

      dias.push(
        <div key={dia} className={`min-h-[120px] p-3 rounded-xl flex flex-col glass-cell transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${esHoy ? 'bg-gradient-to-b from-purple-900/40 to-transparent border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' : 'border-white/5 hover:bg-white/[0.04] hover:border-white/10'}`}>
          <span className={`font-black text-right text-lg mb-2 ${esHoy ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'text-gray-600'}`}>{dia}</span>
          <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
            {objsDelDia.map(obj => (
               <div key={obj.id} className={`text-[11px] p-2 rounded-lg font-bold truncate border border-opacity-20 shadow-sm ${
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
    <main className="min-h-screen bg-[#0a0a0a] p-8 text-gray-300 font-sans selection:bg-purple-500/30 pb-20 relative overflow-hidden">

      {/* Fondo ambiental: orbes + ruido */}
      <div className="orb orb-purple"></div>
      <div className="orb orb-emerald"></div>

      <div className="relative z-10">

      <div className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 tracking-tight">
          Administrador de Tiempos
        </h1>
        
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="bg-purple-600/90 hover:bg-purple-500 text-white font-bold py-2.5 px-6 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(147,51,234,0.3)] border border-purple-500/50 btn-glow">
                Iniciar Sesión
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "w-12 h-12 border-2 border-purple-500/50" } }} />
          </Show>
        </div>
      </div>

      <Show when="signed-out">
        <div className="glass flex flex-col items-center justify-center mt-20 p-10 max-w-2xl mx-auto text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 mb-6 w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-400" strokeWidth={1.75} />
          </div>
          <h2 className="text-3xl font-black text-gray-200 mb-4 relative z-10">Acceso Privado</h2>
          <p className="text-gray-400 mb-8 text-lg relative z-10">
            Inicia sesión para acceder a tu tablero personal. Tus objetivos, rachas y estadísticas estarán guardados de forma segura en la nube.
          </p>
          <SignInButton mode="modal">
            <button className="relative z-10 bg-gray-100 text-gray-900 hover:bg-white font-black py-3 px-8 rounded-xl transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center gap-3 btn-glow">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
          </SignInButton>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-[160px_160px] gap-6 max-w-7xl mx-auto mb-10">
          
          {/* RACHA — NUEVO DISEÑO CENTRADO */}
          <div className="glass stagger md:col-span-2 md:row-span-2 p-8 flex flex-col items-center justify-center relative overflow-hidden text-center group">
            <div className="absolute -right-8 -top-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-125"></div>
            <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                <Flame className="w-10 h-10 text-orange-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-gray-500 text-sm font-bold tracking-widest uppercase mb-2">Racha Actual</p>
                <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 count-num">{calcularRacha()}</p>
                <p className="text-sm text-orange-400/80 font-bold mt-2 uppercase tracking-wider">días consecutivos</p>
              </div>
            </div>
          </div>

          {/* HOY */}
          <div className="glass stagger md:col-span-1 md:row-span-1 p-5 relative overflow-hidden flex flex-col justify-center">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Hoy</p>
            <div className="flex justify-between items-end mb-2">
              <p className="text-3xl font-black text-gray-100 count-num">{completadosHoy}<span className="text-sm text-gray-500 font-medium">/{metaDiaria}</span></p>
              <p className="text-purple-400 font-bold text-sm">{porcentajeHoy}%</p>
            </div>
            <div className="w-full bg-gray-800/60 rounded-full h-1.5 overflow-hidden">
              <div className="bar-fill bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500" style={{ width: `${porcentajeHoy}%` }}></div>
            </div>
          </div>

          {/* TOTAL */}
          <div className="glass stagger md:col-span-1 md:row-span-1 p-5 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Total</p>
              <p className="text-3xl font-black text-gray-100 count-num">{totalHistorico}</p>
            </div>
          </div>

          {/* SUGERENCIA */}
          <div className="glass stagger md:col-span-2 md:row-span-1 p-6 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-blue-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">Sugerencia del día</p>
              <p className="text-sm font-medium text-gray-300 leading-tight">{recomendacion || "Cargando..."}</p>
            </div>
          </div>

        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-10">
          <div className="toggle-wrap shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className={`toggle-pill ${vista === "calendario" ? "right" : ""}`}></div>
            <button onClick={() => setVista("tablero")} className={`toggle-btn ${vista === "tablero" ? "active" : ""}`}>Tablero Kanban</button>
            <button onClick={() => setVista("calendario")} className={`toggle-btn ${vista === "calendario" ? "active" : ""}`}>Vista Mensual</button>
          </div>
        </div>

        <div className={`glass p-6 mb-10 max-w-7xl mx-auto relative z-10 transition-colors duration-300 ${editandoId ? "border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]" : ""}`}>
          <div className="flex justify-between items-center mb-5">
            <h2 className={`font-bold text-sm uppercase tracking-widest flex items-center gap-2 ${editandoId ? "text-purple-400" : "text-gray-500"}`}>
              {editandoId ? <><Pencil className="w-4 h-4"/> Editando Objetivo</> : "Nuevo Objetivo"}
            </h2>
            {editandoId && (
              <button type="button" onClick={cancelarEdicion} className="text-xs text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 transition">
                ✕ Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={guardarObjetivo} className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Título (ej. Estudiar AWS)" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="flex-1 p-3.5 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition" />
            <input type="text" placeholder="Descripción breve..." value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="flex-1 p-3.5 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition" />
            <div className="flex-1 w-full">
            <DatePicker
              selected={fecha ? new Date(fecha + "T00:00:00") : null}
              onChange={(date: Date | null) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFecha(`${year}-${month}-${day}`);
                } else {
                  setFecha("");
                }
              }}
              locale="es"
              dateFormat="dd/MM/yyyy"
              placeholderText="Fecha límite..."
              required
              className="w-full p-3.5 bg-black/40 border border-white/10 rounded-xl text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition shadow-inner"
              wrapperClassName="w-full"
            />
          </div>
            <button type="submit" disabled={!isLoaded} className={`${editandoId ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-purple-600/90 hover:bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.3)]"} text-white font-bold py-3.5 px-8 rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed btn-glow`}>
              {editandoId ? "Actualizar" : "Guardar"}
            </button>
          </form>
        </div>

        {vista === "tablero" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Pendientes */}
            <div className="glass p-6 flex flex-col gap-4 relative">
              <h2 className="font-black text-lg text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <span className="dot-ring w-2 h-2 rounded-full bg-rose-500 text-rose-500"></span> Pendientes
              </h2>
              {objetivos.filter(obj => obj.estado === "Pendiente").map(obj => (
                <div key={obj.id} className="glass kcard p-5 flex flex-col border-rose-900/20 group">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-200">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                    <button onClick={() => avanzarEstado(obj)} className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg hover:bg-rose-500/20 transition font-bold btn-glow">Avanzar →</button>
                  </div>
                </div>
              ))}
            </div>

            {/* En Progreso */}
            <div className="glass p-6 flex flex-col gap-4 relative">
              <h2 className="font-black text-lg text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <span className="dot-ring w-2 h-2 rounded-full bg-purple-500 text-purple-500"></span> En Progreso
              </h2>
              {objetivos.filter(obj => obj.estado === "En Progreso").map(obj => (
                <div key={obj.id} className="glass kcard p-5 flex flex-col border-purple-900/20 group">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-200">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                    <button onClick={() => avanzarEstado(obj)} className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition font-bold btn-glow">Completar ✓</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Completados */}
            <div className="glass p-6 flex flex-col gap-4 relative">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-black text-lg text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> Completados
                </h2>
                <button 
                  onClick={archivarCompletados} 
                  className="text-xs font-bold text-gray-500 hover:text-emerald-400 bg-white/[0.03] hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 transition-all duration-300 btn-glow flex items-center gap-1.5"
                >
                  <Eraser className="w-3.5 h-3.5" /> Limpiar
                </button>
              </div>
              {objetivos.filter(obj => obj.estado === "Completado").map(obj => (
                <div key={obj.id} className="glass kcard p-5 flex flex-col border-emerald-900/20 opacity-80 group hover:opacity-100">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-300 line-through decoration-emerald-500/50">{obj.titulo}</p>
                    <button onClick={() => iniciarEdicion(obj)} className="text-gray-600 hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 mb-4">{obj.descripcion}</p>
                  <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5">
                    <button onClick={() => eliminarObjetivo(obj.id)} className="text-xs text-gray-600 hover:text-rose-500 font-bold transition">Eliminar</button>
                    <span className="text-xs font-mono text-gray-600">{obj.fecha_objetivo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass max-w-7xl mx-auto p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50"></div>
            
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => cambiarMes(-1)} className="bg-black/30 text-gray-400 border border-white/10 px-6 py-3 rounded-xl font-bold hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 transition btn-glow">← Anterior</button>
              <h2 className="text-3xl font-black text-gray-200 capitalize tracking-wider">{mesNombre} <span className="text-purple-500">{anio}</span></h2>
              <button onClick={() => cambiarMes(1)} className="bg-black/30 text-gray-400 border border-white/10 px-6 py-3 rounded-xl font-bold hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 transition btn-glow">Siguiente →</button>
            </div>
            
            <div className="grid grid-cols-7 gap-4 mb-4 text-center font-black text-gray-500 uppercase text-sm tracking-widest">
              <div className="pb-2 border-b border-white/5">Lun</div>
              <div className="pb-2 border-b border-white/5">Mar</div>
              <div className="pb-2 border-b border-white/5">Mié</div>
              <div className="pb-2 border-b border-white/5">Jue</div>
              <div className="pb-2 border-b border-white/5">Vie</div>
              <div className="pb-2 border-b border-white/5">Sáb</div>
              <div className="pb-2 border-b border-white/5">Dom</div>
            </div>
            
            <div className="grid grid-cols-7 gap-4">
              {renderizarCalendario()}
            </div>
          </div>
        )}
      </Show>

      </div>

      <style jsx global>{`
        body::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.05;
          z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        .orb {
          position: fixed;
          border-radius: 999px;
          filter: blur(90px);
          z-index: 0;
          pointer-events: none;
        }
        .orb-purple {
          width: 500px; height: 500px;
          background: rgba(168,85,247,0.18);
          top: -150px; left: -100px;
          animation: drift1 18s ease-in-out infinite alternate;
        }
        .orb-emerald {
          width: 450px; height: 450px;
          background: rgba(16,185,129,0.14);
          bottom: -180px; right: -120px;
          animation: drift2 22s ease-in-out infinite alternate;
        }
        @keyframes drift1 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(60px,40px) scale(1.1); }
        }
        @keyframes drift2 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(-50px,-30px) scale(1.08); }
        }

        .glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          position: relative;
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .glass::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 24px;
          padding: 1px;
          background: linear-gradient(135deg, rgba(168,85,247,0.35), rgba(255,255,255,0) 40%, rgba(16,185,129,0.25));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .glass:hover {
          transform: translateY(-4px);
          border-color: rgba(168,85,247,0.35);
          box-shadow: 0 20px 60px -20px rgba(168,85,247,0.25);
        }

        .glass-cell {
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .count-num {
          animation: rise 0.7s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stagger { opacity: 0; animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        .stagger:nth-child(1) { animation-delay: 0.05s; }
        .stagger:nth-child(2) { animation-delay: 0.12s; }
        .stagger:nth-child(3) { animation-delay: 0.19s; }
        .stagger:nth-child(4) { animation-delay: 0.26s; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .kcard {
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .kcard:hover {
          transform: translateY(-3px) scale(1.01);
        }

        .dot-ring {
          position: relative;
        }
        .dot-ring::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          border: 1px solid currentColor;
          opacity: 0;
          animation: pulseRing 2.2s ease-out infinite;
        }
        @keyframes pulseRing {
          0% { opacity: 0.5; transform: scale(0.6); }
          80% { opacity: 0; transform: scale(1.8); }
          100% { opacity: 0; transform: scale(1.8); }
        }

        .bar-fill {
          animation: fillBar 1.1s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: 0.3s;
        }
        @keyframes fillBar {
          from { width: 0%; }
        }

        .toggle-wrap {
          position: relative;
          display: inline-flex;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 4px;
          backdrop-filter: blur(12px);
        }
        .toggle-pill {
          position: absolute;
          top: 4px; bottom: 4px; left: 4px;
          width: calc(50% - 4px);
          border-radius: 999px;
          background: rgba(168,85,247,0.15);
          border: 1px solid rgba(168,85,247,0.4);
          transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
          z-index: 0;
        }
        .toggle-pill.right { transform: translateX(100%); }
        .toggle-btn {
          position: relative;
          z-index: 1;
          padding: 0.6rem 2rem;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.875rem;
          cursor: pointer;
          background: transparent;
          border: none;
          color: #9ca3af;
          transition: color 0.3s ease;
        }
        .toggle-btn.active { color: #e9d5ff; }

        .btn-glow {
          transition: transform 0.2s ease, box-shadow 0.3s ease;
        }
        .btn-glow:hover { transform: translateY(-2px); }
        .btn-glow:active { transform: translateY(0) scale(0.98); }

        /* Custom Scrollbar for Calendar */
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
          /* --- ESTILOS DEL CALENDARIO REACT-DATEPICKER --- */
        .react-datepicker {
          background: rgba(10, 10, 10, 0.9) !important;
          backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(168, 85, 247, 0.3) !important;
          border-radius: 16px !important;
          font-family: inherit !important;
          box-shadow: 0 10px 40px -10px rgba(168, 85, 247, 0.3) !important;
          overflow: hidden;
        }
        
        .react-datepicker__header {
          background: rgba(255, 255, 255, 0.02) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          padding-top: 12px !important;
        }
        
        .react-datepicker__current-month, 
        .react-datepicker-time__header, 
        .react-datepicker-year-header {
          color: #e9d5ff !important;
          font-weight: 900 !important;
          text-transform: capitalize;
        }
        
        .react-datepicker__day-name {
          color: #9ca3af !important;
          font-weight: 700 !important;
        }
        
        .react-datepicker__day {
          color: #d1d5db !important;
          border-radius: 8px !important;
          transition: all 0.2s ease;
        }
        
        .react-datepicker__day:hover {
          background-color: rgba(168, 85, 247, 0.2) !important;
          color: #fff !important;
        }
        
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected {
          background: linear-gradient(135deg, #9333ea, #10b981) !important;
          color: white !important;
          font-weight: bold !important;
          box-shadow: 0 0 10px rgba(147, 51, 234, 0.5) !important;
        }
        
        .react-datepicker__navigation-icon::before {
          border-color: #a855f7 !important;
        }
        
        .react-datepicker__navigation:hover *::before {
          border-color: #10b981 !important;
        }
      `}</style>
    </main>
  );
}
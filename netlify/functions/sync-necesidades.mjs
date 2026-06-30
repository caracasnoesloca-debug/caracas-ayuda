import { createClient } from '@supabase/supabase-js'

const DESTINO_URL = 'https://zxpfumbsxgnfzxjlhocu.supabase.co'
const DESTINO_KEY = process.env.SUPABASE_SERVICE_KEY

const ESTADO_IMPORTADOS = 'pending'

function categoriaDesde(texto) {
  const t = (texto || '').toLowerCase()
  if (/agua|potab|hidrata/.test(t))                                   return 'agua'
  if (/comida|aliment|viver|mercado|comedor|sopa|arepa|enlatad/.test(t)) return 'comida'
  if (/medic|pastilla|insulina|antibi|suero|losartan|clexane|inhalad|jeringa|gasa/.test(t)) return 'medicamentos'
  if (/refugio|carpa|colchon|albergue|techo|toldo|sabana|cobija/.test(t)) return 'refugio'
  if (/rescate|escombro|atrapad|derrumbe|grua|maquina|retroexcav|bombero|rescatist|traslado|hospital|herida|sos/.test(t)) return 'medico'
  if (/mascota|perro|gato|felino/.test(t))                            return 'mascotas'
  if (/gasolina|combustible/.test(t))                                 return 'combustible'
  if (/carga|cargar|panel solar|starlink/.test(t))                    return 'carga'
  return 'comida'
}

const FUENTES = [

  {
    activa: true,
    prefijo: 'mnv:',
    url: 'https://sdqllcxbohrcemmgpbfu.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcWxsY3hib2hyY2VtbWdwYmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MDkxMDEsImV4cCI6MjA5ODA4NTEwMX0.OrHPm7JfoOFIilr_oGk54xBxStzpxuFMSOs688q4EEk',
    tabla: 'necesidades',
    query: (sb) => sb.from('necesidades').select('*')
      .not('lat', 'is', null).not('lng', 'is', null)
      .neq('estado', 'oculto').neq('urgencia', 'cubierto')
      .order('creado', { ascending: false }).limit(1000),
    mapear: (r) => {
      const titulo = [r.zona, r.estado_zona].filter(Boolean).join(', ')
      const desc = [
        r.urgencia === 'critico' ? 'Critico' : r.urgencia === 'parcial' ? 'Parcial' : '',
        r.personas ? r.personas + ' personas' : ''
      ].filter(Boolean).join(' \u00b7 ')
      return {
        id: r.id,
        nombre: titulo || 'Reporte sin zona',
        categoria: categoriaDesde(r.necesita),
        lat: r.lat, lng: r.lng,
        direccion: r.referencia || null,
        telefono: r.contacto_reporta || null,
        descripcion: desc || null,
        necesitan: r.necesita || null,
        reportado_por: r.nombre_reporta || 'Reporte externo',
        created_at: r.creado,
      }
    },
  },

  {
    activa: true,
    prefijo: 'rde:',
    url: 'https://hqoirxajavaaasvdfjoy.supabase.co',
    key: 'sb_publishable_4qdzpICdtyX6N_XqiVmuYw_Jv_zYvOq',
    tabla: 'necesidades',
    query: (sb) => sb.from('necesidades')
      .select('id,tipo,urgencia,estado,descripcion,zona,lat,lng,reportado_por,creado_en')
      .not('lat', 'is', null).not('lng', 'is', null)
      .in('estado', ['sin_verificar', 'verificada', 'en_proceso'])
      .order('creado_en', { ascending: false }).limit(1000),
    mapear: (r) => {
      const desc = [
        r.urgencia ? 'Urgencia: ' + r.urgencia : '',
        r.descripcion || ''
      ].filter(Boolean).join(' — ')
      return {
        id: r.id,
        nombre: r.zona || 'Reporte',
        categoria: categoriaDesde((r.tipo || '') + ' ' + (r.descripcion || '')),
        lat: r.lat, lng: r.lng,
        direccion: r.zona || null,
        telefono: null,
        descripcion: desc || null,
        necesitan: r.descripcion || null,
        reportado_por: r.reportado_por || 'Reporte externo',
        created_at: r.creado_en || new Date().toISOString(),
      }
    },
  },

  {
    activa: true,
    prefijo: 'rde-ac:',
    url: 'https://hqoirxajavaaasvdfjoy.supabase.co',
    key: 'sb_publishable_4qdzpICdtyX6N_XqiVmuYw_Jv_zYvOq',
    tabla: 'centros_acopio',
    tipoPunto: 'ayuda',
    query: (sb) => sb.from('centros_acopio')
      .select('id,nombre,descripcion,estado,ciudad,direccion,contacto,red_social,lat,lng')
      .not('lat', 'is', null).not('lng', 'is', null)
      .limit(2000),
    mapear: (r) => {
      const ubic = [r.direccion, r.ciudad, r.estado].filter(Boolean).join(', ')
      const desc = [r.descripcion, r.red_social ? 'Red social: ' + r.red_social : '']
        .filter(Boolean).join(' — ')
      return {
        id: r.id,
        nombre: r.nombre || 'Centro de acopio',
        categoria: 'acopio',
        lat: r.lat, lng: r.lng,
        direccion: ubic || null,
        telefono: r.contacto || null,
        descripcion: desc || null,
        necesitan: null,
        reportado_por: 'Red de Esperanza',
        created_at: new Date().toISOString(),
      }
    },
  },

]

export default async (req) => {
  if (!DESTINO_KEY) return new Response('Falta SUPABASE_SERVICE_KEY', { status: 500 })
  const destino = createClient(DESTINO_URL, DESTINO_KEY)

  let totalImportados = 0
  const resumen = []

  for (const f of FUENTES) {
    if (!f.activa) continue
    try {
      const origen = createClient(f.url, f.key)

      const { data: fuente, error: e1 } = await f.query(origen)
      if (e1) { resumen.push(`${f.prefijo} error leyendo: ${e1.message}`); continue }
      if (!fuente?.length) { resumen.push(`${f.prefijo} 0 reportes`); continue }

      const filas = fuente.map(f.mapear).map(m => ({
        nombre: m.nombre,
        categoria: m.categoria,
        lat: m.lat, lng: m.lng,
        direccion: m.direccion,
        telefono: m.telefono,
        descripcion: m.descripcion,
        necesitan: m.necesitan,
        estado: ESTADO_IMPORTADOS,
        tipo: f.tipoPunto || 'necesidad',
        reportado_por: m.reportado_por,
        created_at: m.created_at,
        origen_externo_id: f.prefijo + String(m.id),
      }))

      let insertados = 0
      for (let i = 0; i < filas.length; i += 500) {
        const lote = filas.slice(i, i + 500)
        const { data, error: e3 } = await destino
          .from('puntos')
          .upsert(lote, { onConflict: 'origen_externo_id', ignoreDuplicates: true })
          .select('origen_externo_id')
        if (e3) { resumen.push(`${f.prefijo} error insert: ${e3.message}`); break }
        insertados += (data?.length || 0)
      }

      totalImportados += insertados
      resumen.push(`${f.prefijo} +${insertados}`)
    } catch (err) {
      resumen.push(`${f.prefijo} excepcion: ${err.message}`)
    }
  }

  return new Response('OK ' + totalImportados + ' | ' + resumen.join(' | '), { status: 200 })
}

export const config = { schedule: '* * * * *' }

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  PlayCircle, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Video,
  MessageCircle
} from "lucide-react";

// Video tutorials data
const VIDEO_TUTORIALS = [
  {
    id: 1,
    title: "Cómo crear un artículo",
    description: "Aprende a añadir nuevo inventario paso a paso",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "3:45"
  },
  {
    id: 2,
    title: "Cómo hacer un alquiler",
    description: "Proceso completo desde selección hasta cobro",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "5:20"
  },
  {
    id: 3,
    title: "Cierre de Caja",
    description: "Cómo realizar el cierre diario correctamente",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    duration: "4:15"
  }
];

// FAQ data
const FAQ_DATA = [
  {
    id: 1,
    question: "¿Cómo cambio el IVA de los productos?",
    answer: "Puedes cambiar el IVA desde la sección de Configuración > Tienda. Allí encontrarás las opciones de IVA predeterminado que se aplicarán a todos los nuevos productos. Para productos existentes, puedes editarlos individualmente desde el Inventario."
  },
  {
    id: 2,
    question: "¿Cómo anulo un ticket ya emitido?",
    answer: "Para anular un ticket, ve a la sección de Alquileres Activos, busca el alquiler correspondiente y haz clic en 'Ver Detalles'. Allí encontrarás la opción 'Anular Alquiler'. Ten en cuenta que esta acción requiere permisos de administrador."
  },
  {
    id: 3,
    question: "¿Puedo hacer pagos parciales?",
    answer: "Sí, el sistema permite pagos parciales. Al crear un alquiler, puedes seleccionar el método de pago 'Pendiente de pago' para guardar con 0€ pagados, o con métodos Efectivo/Tarjeta puedes editar el importe a pagar para registrar solo una parte del total. El sistema calculará automáticamente el saldo pendiente."
  },
  {
    id: 4,
    question: "¿Cómo importo productos desde Excel?",
    answer: "Ve a Inventario y haz clic en el botón 'Importar'. Puedes subir un archivo Excel (.xlsx) o CSV con las columnas: Código de Barras, Tipo, Marca, Modelo, Talla. El sistema te guiará para mapear las columnas de tu archivo con los campos del sistema."
  },
  {
    id: 5,
    question: "¿Qué hago si un artículo aparece como 'Alquilado' pero ya fue devuelto?",
    answer: "Ve a Inventario, busca el artículo y haz clic en editar. Allí puedes cambiar manualmente el estado a 'Disponible'. Si el problema persiste, contacta con soporte para revisar el historial del artículo."
  },
  {
    id: 6,
    question: "¿Cómo configuro la impresora de tickets?",
    answer: "Ve a Configuración > Tienda y busca la sección 'Configuración de Impresión'. Allí podrás configurar el formato del ticket, añadir tu logo, y personalizar la información que aparece en cada ticket."
  },
  {
    id: 7,
    question: "¿Puedo tener múltiples usuarios/cajeros?",
    answer: "Sí, puedes crear múltiples usuarios desde la sección de Configuración. Cada usuario puede tener diferentes permisos (cajero, administrador, etc.) y el sistema registra quién realiza cada operación."
  },
  {
    id: 8,
    question: "¿Cómo genero un reporte de ventas?",
    answer: "Ve a la sección Reportes desde el menú lateral. Allí encontrarás diferentes tipos de informes: ventas por día, artículos más alquilados, ingresos por método de pago, etc. Puedes filtrar por fechas y exportar los datos a Excel."
  }
];

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-4 px-5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <span className="font-medium text-slate-900 pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-4 text-slate-600 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(null);

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
  };

  const handleFaqToggle = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <HelpCircle className="h-10 w-10 text-blue-600" />
          <h1 className="text-4xl font-bold text-slate-900">Centro de Ayuda</h1>
        </div>
        <p className="text-lg text-slate-600">
          Encuentra respuestas y aprende a usar todas las funcionalidades
        </p>
      </div>

      {/* VIDEO TUTORIALS SECTION */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Video className="h-6 w-6 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Videotutoriales</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {VIDEO_TUTORIALS.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-slate-100 overflow-hidden group cursor-pointer"
                   onClick={() => handleVideoClick(video)}>
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                  <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{video.title}</CardTitle>
                <CardDescription>{video.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => handleVideoClick(video)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Ver Tutorial
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="mt-12">
        <div className="flex items-center gap-2 mb-6">
          <MessageCircle className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-slate-900">Preguntas Frecuentes</h2>
        </div>

        <Card>
          <CardContent className="p-0">
            {FAQ_DATA.map((faq) => (
              <AccordionItem
                key={faq.id}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaqId === faq.id}
                onToggle={() => handleFaqToggle(faq.id)}
              />
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Need more help CTA */}
      <Card className="bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-200 mt-8">
        <CardContent className="py-6 text-center">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            ¿No encuentras lo que buscas?
          </h3>
          <p className="text-slate-600 mb-4">
            Nuestro equipo de soporte está aquí para ayudarte
          </p>
          <Button 
            onClick={() => window.location.href = '/soporte'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Contactar Soporte
          </Button>
        </CardContent>
      </Card>

      {/* Video Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full">
            {selectedVideo && (
              <iframe
                width="100%"
                height="100%"
                src={selectedVideo.videoUrl}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  PlayCircle, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  Video,
  MessageCircle,
  Loader2
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

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
        <div className="px-5 pb-4 text-slate-600 leading-relaxed whitespace-pre-line">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [openFaqId, setOpenFaqId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      const [videosResponse, faqsResponse] = await Promise.all([
        axios.get(`${API}/help/videos`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API}/help/faqs`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setVideos(videosResponse.data);
      setFaqs(faqsResponse.data);
    } catch (error) {
      console.error("Error loading help content:", error);
      toast.error("Error al cargar el contenido de ayuda");
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
  };

  const handleFaqToggle = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
      {videos.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Video className="h-6 w-6 text-emerald-600" />
            <h2 className="text-2xl font-bold text-slate-900">Videotutoriales</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative aspect-video bg-slate-100 overflow-hidden group cursor-pointer"
                     onClick={() => handleVideoClick(video)}>
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                      <Video className="h-16 w-16 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" />
                  </div>
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  )}
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
      )}

      {/* FAQ SECTION */}
      {faqs.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">Preguntas Frecuentes</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              {faqs.map((faq) => (
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
      )}

      {/* Empty State */}
      {videos.length === 0 && faqs.length === 0 && (
        <Card className="bg-slate-50">
          <CardContent className="py-12 text-center">
            <HelpCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Contenido en preparación
            </h3>
            <p className="text-slate-600 mb-6">
              Estamos preparando videos tutoriales y preguntas frecuentes para ayudarte
            </p>
          </CardContent>
        </Card>
      )}

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
                src={selectedVideo.video_url}
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

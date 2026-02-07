import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Video, 
  MessageCircle,
  Save,
  X,
  GripVertical
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function HelpAdmin() {
  const [videos, setVideos] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingFaq, setEditingFaq] = useState(null);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showFaqDialog, setShowFaqDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVideos();
    loadFaqs();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await axios.get(`${API}/help/videos/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setVideos(response.data);
    } catch (error) {
      console.error("Error loading videos:", error);
      toast.error("Error al cargar videos");
    }
  };

  const loadFaqs = async () => {
    try {
      const response = await axios.get(`${API}/help/faqs/all`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setFaqs(response.data);
    } catch (error) {
      console.error("Error loading FAQs:", error);
      toast.error("Error al cargar FAQs");
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const videoData = {
        title: editingVideo.title,
        description: editingVideo.description,
        video_url: editingVideo.video_url,
        thumbnail_url: editingVideo.thumbnail_url || null,
        duration: editingVideo.duration,
        order: editingVideo.order || 0,
        active: editingVideo.active !== false
      };

      if (editingVideo.id && !editingVideo.id.includes('new-')) {
        // Update existing
        await axios.put(`${API}/help/videos/${editingVideo.id}`, videoData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("Video actualizado correctamente");
      } else {
        // Create new
        await axios.post(`${API}/help/videos`, videoData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("Video creado correctamente");
      }

      loadVideos();
      setShowVideoDialog(false);
      setEditingVideo(null);
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Error al guardar video");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este video?")) return;

    try {
      await axios.delete(`${API}/help/videos/${videoId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Video eliminado correctamente");
      loadVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Error al eliminar video");
    }
  };

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const faqData = {
        question: editingFaq.question,
        answer: editingFaq.answer,
        order: editingFaq.order || 0,
        active: editingFaq.active !== false
      };

      if (editingFaq.id && !editingFaq.id.includes('new-')) {
        // Update existing
        await axios.put(`${API}/help/faqs/${editingFaq.id}`, faqData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("FAQ actualizada correctamente");
      } else {
        // Create new
        await axios.post(`${API}/help/faqs`, faqData, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        toast.success("FAQ creada correctamente");
      }

      loadFaqs();
      setShowFaqDialog(false);
      setEditingFaq(null);
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast.error("Error al guardar FAQ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFaq = async (faqId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta FAQ?")) return;

    try {
      await axios.delete(`${API}/help/faqs/${faqId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("FAQ eliminada correctamente");
      loadFaqs();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error("Error al eliminar FAQ");
    }
  };

  const openVideoDialog = (video = null) => {
    setEditingVideo(video || {
      id: `new-${Date.now()}`,
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: '',
      duration: '',
      order: videos.length,
      active: true
    });
    setShowVideoDialog(true);
  };

  const openFaqDialog = (faq = null) => {
    setEditingFaq(faq || {
      id: `new-${Date.now()}`,
      question: '',
      answer: '',
      order: faqs.length,
      active: true
    });
    setShowFaqDialog(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Administrar Ayuda</h1>
        <p className="text-slate-600 mt-1">
          Gestiona los videos tutoriales y preguntas frecuentes
        </p>
      </div>

      {/* VIDEO TUTORIALS SECTION */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-emerald-600" />
            <CardTitle>Videotutoriales</CardTitle>
          </div>
          <Button onClick={() => openVideoDialog()} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Video
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {videos.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay videos. Crea el primero!</p>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50"
                >
                  <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{video.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{video.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Duración: {video.duration}</span>
                      <span>Orden: {video.order}</span>
                      <span className={video.active ? "text-emerald-600" : "text-red-600"}>
                        {video.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openVideoDialog(video)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVideo(video.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQS SECTION */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <CardTitle>Preguntas Frecuentes</CardTitle>
          </div>
          <Button onClick={() => openFaqDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva FAQ
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {faqs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No hay FAQs. Crea la primera!</p>
            ) : (
              faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-slate-50"
                >
                  <GripVertical className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{faq.question}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{faq.answer}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Orden: {faq.order}</span>
                      <span className={faq.active ? "text-emerald-600" : "text-red-600"}>
                        {faq.active ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFaqDialog(faq)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFaq(faq.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* VIDEO DIALOG */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSaveVideo}>
            <DialogHeader>
              <DialogTitle>
                {editingVideo?.id?.includes('new-') ? 'Nuevo Video' : 'Editar Video'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="video-title">Título *</Label>
                <Input
                  id="video-title"
                  value={editingVideo?.title || ''}
                  onChange={(e) => setEditingVideo({...editingVideo, title: e.target.value})}
                  placeholder="Ej: Cómo crear un artículo"
                  required
                />
              </div>

              <div>
                <Label htmlFor="video-description">Descripción *</Label>
                <Input
                  id="video-description"
                  value={editingVideo?.description || ''}
                  onChange={(e) => setEditingVideo({...editingVideo, description: e.target.value})}
                  placeholder="Breve descripción del contenido"
                  required
                />
              </div>

              <div>
                <Label htmlFor="video-url">URL del Video (YouTube embed) *</Label>
                <Input
                  id="video-url"
                  value={editingVideo?.video_url || ''}
                  onChange={(e) => setEditingVideo({...editingVideo, video_url: e.target.value})}
                  placeholder="https://www.youtube.com/embed/..."
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Usar formato embed: youtube.com/embed/ID_DEL_VIDEO
                </p>
              </div>

              <div>
                <Label htmlFor="thumbnail-url">URL de Miniatura (opcional)</Label>
                <Input
                  id="thumbnail-url"
                  value={editingVideo?.thumbnail_url || ''}
                  onChange={(e) => setEditingVideo({...editingVideo, thumbnail_url: e.target.value})}
                  placeholder="https://img.youtube.com/vi/ID_DEL_VIDEO/maxresdefault.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duración *</Label>
                  <Input
                    id="duration"
                    value={editingVideo?.duration || ''}
                    onChange={(e) => setEditingVideo({...editingVideo, duration: e.target.value})}
                    placeholder="Ej: 3:45"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="order">Orden</Label>
                  <Input
                    id="order"
                    type="number"
                    value={editingVideo?.order || 0}
                    onChange={(e) => setEditingVideo({...editingVideo, order: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="video-active"
                  checked={editingVideo?.active !== false}
                  onChange={(e) => setEditingVideo({...editingVideo, active: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="video-active" className="cursor-pointer">Activo (visible en el Centro de Ayuda)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowVideoDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAQ DIALOG */}
      <Dialog open={showFaqDialog} onOpenChange={setShowFaqDialog}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSaveFaq}>
            <DialogHeader>
              <DialogTitle>
                {editingFaq?.id?.includes('new-') ? 'Nueva FAQ' : 'Editar FAQ'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="faq-question">Pregunta *</Label>
                <Input
                  id="faq-question"
                  value={editingFaq?.question || ''}
                  onChange={(e) => setEditingFaq({...editingFaq, question: e.target.value})}
                  placeholder="Ej: ¿Cómo cambio el IVA?"
                  required
                />
              </div>

              <div>
                <Label htmlFor="faq-answer">Respuesta *</Label>
                <Textarea
                  id="faq-answer"
                  value={editingFaq?.answer || ''}
                  onChange={(e) => setEditingFaq({...editingFaq, answer: e.target.value})}
                  placeholder="Respuesta detallada..."
                  rows={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="faq-order">Orden</Label>
                <Input
                  id="faq-order"
                  type="number"
                  value={editingFaq?.order || 0}
                  onChange={(e) => setEditingFaq({...editingFaq, order: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="faq-active"
                  checked={editingFaq?.active !== false}
                  onChange={(e) => setEditingFaq({...editingFaq, active: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="faq-active" className="cursor-pointer">Activa (visible en el Centro de Ayuda)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFaqDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

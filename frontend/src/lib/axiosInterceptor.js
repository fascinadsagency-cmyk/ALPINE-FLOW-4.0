import axios from "axios";

let limitExceededHandler = null;

/**
 * Registrar un manejador global para errores de límite de plan
 * Este manejador se llamará cuando se detecte un error 403 con limit_exceeded
 */
export const registerLimitExceededHandler = (handler) => {
  limitExceededHandler = handler;
};

/**
 * Configurar interceptor de respuesta de Axios
 * Detecta errores 403 con {"detail": "limit_exceeded", "limit_type": "..."}
 * y dispara el modal de upgrade
 */
export const setupAxiosInterceptors = () => {
  axios.interceptors.response.use(
    (response) => {
      // Si la respuesta es exitosa, pasarla sin modificar
      return response;
    },
    (error) => {
      // Verificar si es un error 403 con limit_exceeded
      if (error.response?.status === 403) {
        const errorData = error.response.data;
        
        // Detectar el error específico de límite de plan
        if (errorData?.detail === "limit_exceeded" && errorData?.limit_type) {
          // Si hay un manejador registrado, llamarlo
          if (limitExceededHandler) {
            limitExceededHandler({
              limitType: errorData.limit_type,
              currentCount: errorData.current_count,
              maxAllowed: errorData.max_allowed,
              planName: errorData.plan_name
            });
          }
          
          // Rechazar la promesa para que el código que hizo la llamada pueda manejarla
          return Promise.reject(error);
        }
      }
      
      // Para cualquier otro error, simplemente rechazarlo
      return Promise.reject(error);
    }
  );
};

export default setupAxiosInterceptors;

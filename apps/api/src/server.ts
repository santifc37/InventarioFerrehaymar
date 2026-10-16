import { crearApp } from './app';

const puerto = Number(process.env.PORT) || 4000;

crearApp().listen(puerto, () => {
  console.log(`API escuchando en el puerto ${puerto}`);
});

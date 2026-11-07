/* Configuração do painel do administrador (Firebase + EmailJS).
   Estes valores não são senhas: o Firebase foi feito para que fiquem no site.
   A proteção de quem pode gravar está nas regras do Firestore. */
window.LOUVOR_CONFIG = {
  dono: 'atosstan98@hotmail.com',
  firebase: {
    apiKey: 'AIzaSyBm2XHq-BvFzQzgZVKmcOF1-8UEZUDhGJ4',
    authDomain: 'louvor-4ipbgv.firebaseapp.com',
    projectId: 'louvor-4ipbgv',
    appId: '1:221030750557:web:c17bbb4eb70746a48230b4'
  },
  /* chave da busca de vídeos no YouTube (só funciona a partir do site, restrita ao YouTube Data API) */
  youtubeKey: 'AIzaSyArvWXBHRmzInqvGraAG57wEkij2gG77ww',
  emailjs: {
    publicKey: '',
    serviceId: '',
    templateId: ''
  }
};

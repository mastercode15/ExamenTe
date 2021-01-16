# Chat en Ionic Angular integrado autenticación de Firebase

En este caso se va a detallar algunos componentes y partes del código que se utilizaron para desarrollar un chat que permita enviar mensajes de texto y enviar imágenes como un usuario autenticado de Firebase. Cabe recalcar que:
- El usuario debe estar registrado en la aplicación para poder iniciar sesión y acceder al chat.
- Las imágenes deben guardarse en el Storage de Firebase y a su vez en Relatime Database.
- Los mensajes deben guardarse en Relatime Database.
- Los mensajes y las imágenes deben guardarse de manera cifrada.
- la aplicación fue creada con el comando ```ionic start "nombre_app"``` seleccionando la opción de utilizar angular y no incluir capacitor

## Prerequisitos
Se deben isntalar las siguientes librerias en el directorio del proyecto:
- ```npm install @ionic-native/camera```
- ```npm install @angular/fire```
- ```npm install @ionic/angular```
- ```npm install crypto-js```

Conociendo todas estas consideraciones pasemos a explicar el código por cada una de las secciones que se realizó

#### creación de servicios:
Se crean dos servicios en una carpeta llamada services dentro del directorio src, se creará tanto el servicio de autenticación como servicios generales de Firebase, para esto se utilizan los comandos 
-	```Ionic generate service /services/authenticate```
-	```Ionic generate service /services/firebase ```

### Inicio de sesión y registro
Para el inicio de sesión se requiere generar una página nueva, para esto se utiliza el comando
- ```ionic generate page login``` el mismo que va a crear toda la estructura de archivos necesaria
Los dos archivos más importantes serán ```login.page.html``` y ```login.page.ts```
En el primer archivo tendremos todo lo que es FrontEnd en donde se llamarán a las funciones respectivas que se encuentran en nuestro Backend, el mismo que será nuestro segundo archivo.
```
  loginUser(value) {
    this.authService.loginUser(value)
      .then(res => {
        console.log(res);
        this.errorMessage = "";
        this.navCtrl.navigateForward('/dashboard');
      }, err => {
        this.errorMessage = err.message;
      })
  }
  
    goToRegisterPage() {
    this.navCtrl.navigateForward('/register');
  }
```
La función loginUser() que trata de autenticar al usuario y la función goToRegistePage() que nos ridirige al págania de registrar usuario

Para poder generar la página de registro de usuarios se utiliza el comando ```ionic generate page register```

el archivo ```register.page.ts``` contendrá dos funciones importantes una que trata de registrar al usuario en la base de datos y otra que redirige a la página de inicio:
```
  tryRegister(value) {
    this.authService.registerUser(value)
      .then(res => {
        console.log(res);
        this.errorMessage = "";
        this.successMessage = "Your account has been created. Please log in.";
      }, err => {
        console.log(err);
        this.errorMessage = err.message;
        this.successMessage = "";
      })
  }

  goLoginPage() {
    this.navCtrl.navigateBack('');
  }
```

## Página de chat
Para generar esta página se utiliza el comando ```ionic generate page dashboard```
En este caso en el```dashboard.page.ts``` se va a utilizar una función del servicio creado en firebase, por ende se debe importar este servicio en el archivo mencionado

La primera función del servicio me permite almacenar los mensajes en el servidor de firebase para ello se utiliza Realtime Database que tambien se debe importar en el servicio,
la segunda función me permite recibir los mensajes y almacenarlos para mostrarlos en pantalla.
```
 constructor(
    private rtdb: AngularFireDatabase
  ) { }


  sendMessage(record) {
    return this.rtdb.list('/chat/').push(record);
  }

  
  getMessage() {
    return this.rtdb.database.ref('/chat');
  }
}
```
Por otro lado en el archivo el```dashboard.page.ts``` se hace referencia a la función sendMessage() el mismo que almacena la información provista en el FrontEnd del chat, se declara
un objeto el cual va a obtener la información a cargar a firebase en Realtime Database, se utiliza un condicional ya que pueden existir 2 tipos de archivos, uno que puede imagen
y otro que puede ser texto, este condicional también se utiliza en la función getMessage() para que pueda diferenciar estos archivos y pueda mostrar la información correcta.

```
  async sendMessage() {
    let messageToSend = {};
    if (this.tmpImage !== undefined) {
      messageToSend = {
        uid: this.userID,
        email: this.userEmail,
        imageMessage: crypto.AES.encrypt(this.message, this.encryptKey).toString()
      };
      this.tmpImage = undefined;
    } else {
      messageToSend = {
        uid: this.userID,
        email: this.userEmail,
        message: crypto.AES.encrypt(this.message, this.encryptKey).toString()
      };
    }
    try {
      await this.firebaseServ.sendMessage(messageToSend);
      this.message = '';
    } catch (e) {
      console.log('error', e);
    }
  }
```
getMessage()  me devuelve cada uno de los datos obtenidos en un arreglo, para posteriormente recorrer ese arreglo que contiene el id del usuario que envió el mensaje, el mensaje 
encriptado y el email del usuario que envía el mensaje, una vez obtenida esta información, se procede a agregarlo a nuestro arreglo declarado al cual se le denomina chats.

```
    this.firebaseServ.getMessage().on('value', (messageSnap) => {
      this.chats = [];
      messageSnap.forEach((messageData) => {
        console.log('messageData', messageData.val());
        if (messageData.val().imageMessage) {
          this.chats.push({
            email: messageData.val().email,
            imageMessage: crypto.AES.decrypt(messageData.val().imageMessage, this.encryptKey).toString(crypto.enc.Utf8),
            uid: messageData.val().uid,
          });
        } else {
          this.chats.push({
            email: messageData.val().email,
            message: crypto.AES.decrypt(messageData.val().message, this.encryptKey).toString(crypto.enc.Utf8),
            uid: messageData.val().uid,
          });
        }
      })
    });
```

## Envío de imágenes al por chat
Las funciones para el envío de imagenes van a estar alojadas en el ```dashboard.page.ts``` la función que va a ser llamada mediante el boton va a ser presentActionSheetCamera()
la misma que dará 3 opciones a escoger:
1. Tomar una foto
2. Seleccionar una imagen guardada
3. Cancelar
En las dos primeras opciones se llama a la función takePhoto() que lo que va a realizar como su nombre lo indica es obtener la imagen que se captura o que se selecciona de los 
archivos quue serán almacenados dentro de las opciones de la cámara, para posteriormente usar la función getPictures(options) pasando como parametro las opciones generadas,
esta función devuelve una primesa que en este caso es la data de la imagen, que va a ser convertida en una imagen en base a 64 bits y e este caso se va a guardar en una variable
llamada tmpimage haciendo referencia a que es una imagen temporal, posterior a ello se utiliza dos variables declaradas:
-  putPictures: que se encarga de subir la imagen al storage de Firebase 
-  getPictures:  que se encarga de obtener el url almacenado en el storage de Firebase para ponerlo como mensaje a enviar 
```
  takePhoto(sourceType) {
    try {
      const options: CameraOptions = {
        quality: 50,
        targetHeight: 600,
        targetWidth: 600,
        destinationType: this.camera.DestinationType.DATA_URL,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        correctOrientation: true,
        sourceType
      };


      this.camera.getPicture(options)
        .then(async (imageData) => {
          console.log('Data de la imagen --------->', imageData);
          this.tmpImage = 'data:image/jpeg;base64,' + imageData;
          const putPictures = firebase.storage().ref('imagesMessage/' + this.imageId + '.jpeg');
          putPictures.putString(this.tmpImage, 'data_url').then((snapshot) => {
            console.log('snapshot', snapshot.ref);
          });
          const getPicture = firebase.storage().ref('imagesMessage/' + this.imageId + '.jpeg').getDownloadURL();
          getPicture.then((url) => {
            this.message = url;
          });
        })
        .catch((e) => {
          console.log(e);
          this.tmpImage = undefined;
        });
    } catch (e) {
      console.log(e);
      this.tmpImage = undefined;
    }
  }

  async presentActionSheetCamera() {
    const actionSheet = await this.actionSheetController.create({
      buttons: [
        {
          text: 'Cámara',
          handler: () => {
            this.takePhoto(this.camera.PictureSourceType.CAMERA);
          }
        }, {
          text: 'Ver imágenes guardadas',
          handler: () => {
            this.takePhoto(this.camera.PictureSourceType.PHOTOLIBRARY);
          }
        }, {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }
```

## Encriptación de mensajes
Anteriormente se mostró las funciones más relevantes del del enviar mensaje y recibir los mensajes para mostrarlos en la interfaz, pero se ahora se va a explicar
lo que hace que sea posible guardar los mensajes de manera cifrada, para esto se utiliza la librería ```crypto-js``` que se instaló al inicio del proyecto, lo que hace esta librería
es encriptar y desencriptar los mensajes, en este caso con un tipo de seguridad AES (Advance Encryptation Standar), posterior a ello se utiliza el método encriptar o desencriptar
correspondientemente pasando como parámetro de este método el valor que se quiere desencriptar y la clave de encriptación, por último, el resultado se tranforma en una cadena 
que unicamente en el caso de la desencriptación tiene como parámetro el formato de codificación de caracteres Utf8 (crypto.enc.Utf8).
- Encriptación y desencriptación del mensaje:
```
message: crypto.AES.encrypt(this.message, this.encryptKey).toString()
message: crypto.AES.decrypt(messageData.val().message, this.encryptKey).toString(crypto.enc.Utf8)
```

- Encriptación y desencriptación de la imagen:
``` 
imageMessage: crypto.AES.encrypt(this.message, this.encryptKey).toString()
imageMessage: crypto.AES.decrypt(messageData.val().imageMessage, this.encryptKey).toString(crypto.enc.Utf8)
```



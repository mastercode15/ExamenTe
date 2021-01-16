// dashboard.page.ts
import { Component, OnInit } from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';
import { AuthenticateService } from '../services/authentication.service';
import { FirebaseService } from '../services/firebase.service'
import firebase from 'firebase';
import { Camera, CameraOptions } from '@ionic-native/camera/ngx'
import * as crypto from 'crypto-js';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  userID: string;
  userEmail: string;
  message: string;
  chats: any = [];
  tmpImage: any = undefined;
  encryptKey: string = "*/*-$%^@!@#";

  imageId = Math.floor(Math.random() * 500);


  constructor(
    private navCtrl: NavController,
    private authService: AuthenticateService,
    private firebaseServ: FirebaseService,
    private actionSheetController: ActionSheetController,
    private camera: Camera
  ) { }

  ngOnInit() {

    this.authService.userDetails().subscribe(res => {
      console.log('res', res);
      if (res !== null) {
        this.userID = res.uid;
        this.userEmail = res.email;
      } else {
        this.navCtrl.navigateBack('');
      }
    }, err => {
      console.log('err', err);
    })
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
  }


  logout() {
    this.authService.logoutUser()
      .then(res => {
        console.log(res);
        this.navCtrl.navigateBack('');
      })
      .catch(error => {
        console.log(error);
      })
  }

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


}

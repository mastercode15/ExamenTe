// firebase.service.ts
import { Injectable } from '@angular/core';
import { AngularFireDatabase } from '@angular/fire/database';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  collectionName = 'Students';

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

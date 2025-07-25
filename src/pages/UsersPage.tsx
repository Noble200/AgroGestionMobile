import React from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton
} from '@ionic/react';
import { people, construct } from 'ionicons/icons';

export const UsersPage: React.FC = () => {
  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Usuarios</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state">
          <IonIcon icon={people} />
          <h3>Gestión de Usuarios</h3>
          <p>Administra los usuarios del sistema, permisos y roles de acceso.</p>
          <IonButton className="agro-button">
            <IonIcon icon={construct} slot="start" />
            Próximamente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default UsersPage;
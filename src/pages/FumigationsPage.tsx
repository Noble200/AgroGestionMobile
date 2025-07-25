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
import { water, construct } from 'ionicons/icons';

export const FumigationsPage: React.FC = () => {
  return (
    <IonPage className="agrogestion-page">
      <IonHeader className="agrogestion-header">
        <IonToolbar>
          <IonTitle>Fumigaciones</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="empty-state">
          <IonIcon icon={water} />
          <h3>Fumigaciones</h3>
          <p>Programa y gestiona las fumigaciones de tus campos para mantener cultivos saludables.</p>
          <IonButton className="agro-button">
            <IonIcon icon={construct} slot="start" />
            Próximamente
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FumigationsPage;
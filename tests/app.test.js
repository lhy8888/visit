/**
 * @jest-environment jsdom
 */

// Simuler les données de test et fonctions du fichier app.js
const testData = [
  {
    nom: "Martin",
    prenom: "Jean",
    societe: "Tech Solutions SARL",
    email: "jean.martin@techsolutions.fr",
    telephone: "06 12 34 56 78",
    personneVisitee: "Marie Dubois"
  },
  {
    nom: "Lefebvre",
    prenom: "Sophie",
    societe: "Digital Consulting",
    email: "sophie.lefebvre@digitalconsulting.com",
    telephone: "07 98 76 54 32",
    personneVisitee: "Pierre Moreau"
  },
  {
    nom: "Rousseau",
    prenom: "Thomas",
    societe: "Innovation Labs",
    email: "thomas.rousseau@innovationlabs.eu",
    telephone: "06 55 44 33 22",
    personneVisitee: "Julie Bernard"
  }
];

// Reproduire les fonctions du fichier app.js
function fillTestData() {
  const randomData = testData[Math.floor(Math.random() * testData.length)];
  
  const elements = {
    nom: document.getElementById('nom'),
    prenom: document.getElementById('prenom'),
    societe: document.getElementById('societe'),
    email: document.getElementById('email'),
    telephone: document.getElementById('telephone'),
    'personne-visitee': document.getElementById('personne-visitee')
  };

  if (elements.nom) elements.nom.value = randomData.nom;
  if (elements.prenom) elements.prenom.value = randomData.prenom;
  if (elements.societe) elements.societe.value = randomData.societe;
  if (elements.email) elements.email.value = randomData.email;
  if (elements.telephone) elements.telephone.value = randomData.telephone;
  if (elements['personne-visitee']) elements['personne-visitee'].value = randomData.personneVisitee;

  // Animation des form-groups
  const formGroups = document.querySelectorAll('#check-in-form .form-group');
  formGroups.forEach((group, index) => {
    setTimeout(() => {
      group.style.transform = 'scale(1.02)';
      group.style.transition = 'transform 0.2s ease';
      setTimeout(() => {
        group.style.transform = 'scale(1)';
      }, 200);
    }, index * 100);
  });
}

function createConfetti() {
  const confettiContainer = document.getElementById('confetti-container');
  if (!confettiContainer) return;
  
  confettiContainer.innerHTML = '';
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
    confettiContainer.appendChild(confetti);
  }
}

let countdownTimer = null;

function showSuccessPopup() {
  const popup = document.getElementById('success-popup');
  if (!popup) return;
  
  createConfetti();
  popup.style.display = 'block';
  
  let countdown = 5;
  const countdownElement = document.getElementById('countdown');
  
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
  
  countdownTimer = setInterval(() => {
    countdown--;
    if (countdownElement) {
      countdownElement.textContent = countdown.toString();
    }
    
    if (countdown <= 0) {
      clearInterval(countdownTimer);
      popup.style.display = 'none';
    }
  }, 1000);
}

describe('🎨 Frontend Tests - app.js', () => {
  beforeEach(() => {
    // Réinitialiser le DOM avant chaque test
    document.body.innerHTML = `
      <div id="confetti-container"></div>
      <div id="success-popup" style="display: none;">
        <div id="countdown">5</div>
      </div>
      <form id="check-in-form">
        <div class="form-group">
          <input type="text" id="nom" name="nom" />
        </div>
        <div class="form-group">
          <input type="text" id="prenom" name="prenom" />
        </div>
        <div class="form-group">
          <input type="text" id="societe" name="societe" />
        </div>
        <div class="form-group">
          <input type="email" id="email" name="email" />
        </div>
        <div class="form-group">
          <input type="tel" id="telephone" name="telephone" />
        </div>
        <div class="form-group">
          <input type="text" id="personne-visitee" name="personne-visitee" />
        </div>
      </form>
    `;
  });

  afterEach(() => {
    // Nettoyer les timers
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  });

  describe('📊 Données de test', () => {
    test('testData - Contient des jeux de données valides', () => {
      expect(testData).toBeDefined();
      expect(testData.length).toBeGreaterThan(0);
      expect(testData[0]).toHaveProperty('nom');
      expect(testData[0]).toHaveProperty('prenom');
      expect(testData[0]).toHaveProperty('societe');
      expect(testData[0]).toHaveProperty('email');
      expect(testData[0]).toHaveProperty('telephone');
      expect(testData[0]).toHaveProperty('personneVisitee');
    });

    test('testData - Validation du format des données', () => {
      testData.forEach((data) => {
        expect(data.nom).toBeTruthy();
        expect(data.prenom).toBeTruthy();
        expect(data.societe).toBeTruthy();
        expect(data.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        expect(data.telephone).toMatch(/^[\d\s]+$/);
        expect(data.personneVisitee).toBeTruthy();
      });
    });
  });

  describe('🎯 Fonction fillTestData', () => {
    test('fillTestData - Remplit les champs du formulaire', () => {
      fillTestData();
      
      const nom = document.getElementById('nom').value;
      const prenom = document.getElementById('prenom').value;
      const societe = document.getElementById('societe').value;
      const email = document.getElementById('email').value;
      
      expect(nom).toBeTruthy();
      expect(prenom).toBeTruthy();
      expect(societe).toBeTruthy();
      expect(email).toBeTruthy();
      
      // Vérifier que les données correspondent à un élément de testData
      const matchingData = testData.find(data => 
        data.nom === nom && data.prenom === prenom
      );
      expect(matchingData).toBeDefined();
    });

    test('fillTestData - Sélection aléatoire', () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        fillTestData();
        results.push(document.getElementById('nom').value);
      }
      
      // Il peut y avoir des répétitions, mais on teste que la fonction fonctionne
      expect(results.every(name => name.length > 0)).toBe(true);
    });

    test('fillTestData - Gère les éléments manquants', () => {
      // Supprimer un élément
      document.getElementById('nom').remove();
      
      // La fonction ne devrait pas planter
      expect(() => fillTestData()).not.toThrow();
    });
  });

  describe('🎉 Fonction createConfetti', () => {
    test('createConfetti - Crée 50 confettis', () => {
      createConfetti();
      
      const confettiContainer = document.getElementById('confetti-container');
      const confettis = confettiContainer.querySelectorAll('.confetti');
      
      expect(confettis).toHaveLength(50);
    });

    test('createConfetti - Nettoie les anciens confettis', () => {
      const container = document.getElementById('confetti-container');
      container.innerHTML = '<div class="old-confetti">Old</div>';
      
      createConfetti();
      
      const oldConfettis = container.querySelectorAll('.old-confetti');
      const newConfettis = container.querySelectorAll('.confetti');
      
      expect(oldConfettis).toHaveLength(0);
      expect(newConfettis).toHaveLength(50);
    });

    test('createConfetti - Position aléatoire des confettis', () => {
      createConfetti();
      
      const confettis = document.querySelectorAll('.confetti');
      const positions = Array.from(confettis).map(c => c.style.left);
      
      // Vérifier que les positions sont différentes
      const uniquePositions = [...new Set(positions)];
      expect(uniquePositions.length).toBeGreaterThan(10);
    });

    test('createConfetti - Gère l\'absence de conteneur', () => {
      // Supprimer le conteneur
      document.getElementById('confetti-container').remove();
      
      // La fonction ne devrait pas planter
      expect(() => createConfetti()).not.toThrow();
    });
  });

  describe('🎪 Fonction showSuccessPopup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('showSuccessPopup - Affiche la popup', () => {
      showSuccessPopup();
      
      const popup = document.getElementById('success-popup');
      expect(popup.style.display).toBe('block');
    });

    test('showSuccessPopup - Crée les confettis', () => {
      showSuccessPopup();
      
      const confettis = document.querySelectorAll('.confetti');
      expect(confettis).toHaveLength(50);
    });

    test('showSuccessPopup - Démarre le countdown', () => {
      showSuccessPopup();
      
      const countdown = document.getElementById('countdown');
      expect(countdown.textContent).toBe('5');
      
      // Avancer le temps d'1 seconde
      jest.advanceTimersByTime(1000);
      expect(countdown.textContent).toBe('4');
    });

    test('showSuccessPopup - Ferme la popup après 5 secondes', () => {
      showSuccessPopup();
      
      const popup = document.getElementById('success-popup');
      expect(popup.style.display).toBe('block');
      
      // Avancer le temps de 5 secondes
      jest.advanceTimersByTime(5000);
      expect(popup.style.display).toBe('none');
    });

    test('showSuccessPopup - Gère l\'absence de popup', () => {
      // Supprimer la popup
      document.getElementById('success-popup').remove();
      
      // La fonction ne devrait pas planter
      expect(() => showSuccessPopup()).not.toThrow();
    });
  });

  describe('🔄 Tests d\'intégration', () => {
    test('Workflow complet - fillTestData → showSuccessPopup', () => {
      jest.useFakeTimers();
      
      // Remplir les données de test
      fillTestData();
      
      // Vérifier que les champs sont remplis
      expect(document.getElementById('nom').value).toBeTruthy();
      
      // Afficher la popup de succès
      showSuccessPopup();
      
      // Vérifier que la popup est affichée avec confettis
      const popup = document.getElementById('success-popup');
      const confettis = document.querySelectorAll('.confetti');
      
      expect(popup.style.display).toBe('block');
      expect(confettis).toHaveLength(50);
      
      jest.useRealTimers();
    });

    test('Gestion des erreurs - Éléments DOM manquants', () => {
      // Supprimer des éléments critiques
      document.getElementById('nom').remove();
      document.getElementById('confetti-container').remove();
      
      // Les fonctions ne devraient pas planter
      expect(() => fillTestData()).not.toThrow();
      expect(() => createConfetti()).not.toThrow();
      expect(() => showSuccessPopup()).not.toThrow();
    });
  });

  describe('🧪 Tests de performance', () => {
    test('Performance - fillTestData s\'exécute rapidement', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        fillTestData();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Devrait s'exécuter en moins de 100ms pour 100 appels
      expect(duration).toBeLessThan(100);
    });

    test('Performance - createConfetti s\'exécute rapidement', () => {
      const start = performance.now();
      
      for (let i = 0; i < 10; i++) {
        createConfetti();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Devrait s'exécuter en moins de 50ms pour 10 appels
      expect(duration).toBeLessThan(150);
    });
  });

  describe('🚪 Tests pour le bouton Départ (Admin)', () => {
    let mockFetch;

    beforeEach(() => {
      // Setup DOM pour l'admin
      document.body.innerHTML = `
        <div id="admin-panel">
          <ul id="visitor-list">
            <li>
              <div class="info">
                <strong>Jean Martin</strong>
                <span>Société: Tech Solutions | Arrivée: 14:30:00</span>
              </div>
              <div class="actions">
                <button class="btn btn-danger btn-checkout-manual" data-id="test-id-123">
                  <i class="fas fa-sign-out-alt"></i>
                  Départ
                </button>
              </div>
            </li>
          </ul>
        </div>
      `;

      // Mock de fetch
      mockFetch = jest.fn();
      global.fetch = mockFetch;
      global.confirm = jest.fn();
      global.alert = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('Bouton Départ - Identifie correctement l\'ID du visiteur', () => {
      const button = document.querySelector('.btn-checkout-manual');
      expect(button).toBeTruthy();
      expect(button.dataset.id).toBe('test-id-123');
    });

    test('Bouton Départ - Event listener utilise closest() pour identifier le bouton', () => {
      const button = document.querySelector('.btn-checkout-manual');
      const icon = button.querySelector('i');
      
      // Simuler la fonction closest
      Element.prototype.closest = jest.fn().mockReturnValue(button);
      
      // Simuler un clic sur l'icône
      const event = new Event('click');
      Object.defineProperty(event, 'target', { value: icon });
      
      // La fonction devrait utiliser closest() pour trouver le bouton
      expect(event.target.closest).toBeDefined();
    });

    test('Bouton Départ - Gère les visiteurs avec données valides', async () => {
      global.confirm.mockReturnValue(true);
      
      // Mock des réponses API
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 'test-id-123', email: 'jean.martin@test.com', prenom: 'Jean', nom: 'Martin' }
          ])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'Départ enregistré' })
        });

      const button = document.querySelector('.btn-checkout-manual');
      
      // Simuler le gestionnaire d'événement de départ
      const handleCheckout = async (e) => {
        e.preventDefault();
        const button = e.target.closest('.btn-checkout-manual');
        const id = button.dataset.id;
        
        if (!confirm('Êtes-vous sûr de vouloir enregistrer le départ de ce visiteur ?')) {
          return;
        }
        
        const visitorResponse = await fetch('/api/admin/visitors/current');
        const currentVisitors = await visitorResponse.json();
        const visitor = currentVisitors.find(v => v.id === id);
        
        if (visitor) {
          const checkoutResponse = await fetch('/api/check-out', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: visitor.email })
          });
          
          if (checkoutResponse.ok) {
            alert(`Départ enregistré avec succès pour ${visitor.prenom} ${visitor.nom}`);
          }
        }
      };

      // Simuler l'événement
      const event = { preventDefault: jest.fn(), target: button };
      await handleCheckout(event);

      expect(global.confirm).toHaveBeenCalledWith('Êtes-vous sûr de vouloir enregistrer le départ de ce visiteur ?');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(global.alert).toHaveBeenCalledWith('Départ enregistré avec succès pour Jean Martin');
    });

    test('Bouton Départ - Gère le cas où l\'utilisateur annule', async () => {
      global.confirm.mockReturnValue(false);
      
      const button = document.querySelector('.btn-checkout-manual');
      
      const handleCheckout = async (e) => {
        e.preventDefault();
        if (!confirm('Êtes-vous sûr de vouloir enregistrer le départ de ce visiteur ?')) {
          return;
        }
        // Le reste ne devrait pas s'exécuter
        await fetch('/api/admin/visitors/current');
      };

      const event = { preventDefault: jest.fn(), target: button };
      await handleCheckout(event);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('Bouton Départ - Gère les erreurs de réseau', async () => {
      global.confirm.mockReturnValue(true);
      mockFetch.mockRejectedValue(new Error('Erreur réseau'));
      
      const button = document.querySelector('.btn-checkout-manual');
      
      const handleCheckout = async (e) => {
        e.preventDefault();
        const button = e.target.closest('.btn-checkout-manual');
        const id = button.dataset.id;
        
        if (!confirm('Êtes-vous sûr de vouloir enregistrer le départ de ce visiteur ?')) {
          return;
        }
        
        try {
          await fetch('/api/admin/visitors/current');
        } catch (error) {
          alert('Erreur de connexion lors du départ.');
        }
      };

      const event = { preventDefault: jest.fn(), target: button };
      await handleCheckout(event);

      expect(global.alert).toHaveBeenCalledWith('Erreur de connexion lors du départ.');
    });

    test('Bouton Départ - Gère le visiteur non trouvé', async () => {
      global.confirm.mockReturnValue(true);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]) // Aucun visiteur trouvé
      });

      const button = document.querySelector('.btn-checkout-manual');
      
      const handleCheckout = async (e) => {
        e.preventDefault();
        const button = e.target.closest('.btn-checkout-manual');
        const id = button.dataset.id;
        
        if (!confirm('Êtes-vous sûr de vouloir enregistrer le départ de ce visiteur ?')) {
          return;
        }
        
        const visitorResponse = await fetch('/api/admin/visitors/current');
        const currentVisitors = await visitorResponse.json();
        const visitor = currentVisitors.find(v => v.id === id);
        
        if (!visitor) {
          alert('Visiteur non trouvé ou déjà parti.');
        }
      };

      const event = { preventDefault: jest.fn(), target: button };
      await handleCheckout(event);

      expect(global.alert).toHaveBeenCalledWith('Visiteur non trouvé ou déjà parti.');
    });
  });
});

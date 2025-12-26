import { MenuItem } from "./menu.model";

export const MENU: MenuItem[] = [
  { id: 1, label: "Navigation", isTitle: true },

  {
    id: 2,
    label: "Tableau de bord",
    icon: "bx-home-circle",
    link: "/megafast/dashboard",
  },

  {
    id: 3,
    label: "Colis",
    icon: "bx-package",
    subItems: [
      { id: 4, label: "Liste des colis", link: "/megafast/colis", parentId: 3 },
      {
        id: 5,
        label: "Créer un colis",
        link: "/megafast/colis/create",
        parentId: 3,
      },
    ],
  },

  {
    id: 6,
    label: "Clients",
    icon: "bx-user",
    subItems: [
      {
        id: 7,
        label: "Liste des clients",
        link: "/megafast/clients",
        parentId: 6,
      },
      {
        id: 22,
        label: "Dashboard clients",
        link: "/megafast/clients/dashboard",
        parentId: 6,
      },
    ],
  },

  {
    id: 8,
    label: "Livreurs",
    icon: "bx-id-card",
    subItems: [
      // routes MEGAFAST_ROUTES: 'drivers'
      {
        id: 9,
        label: "Liste des livreurs",
        link: "/megafast/drivers",
        parentId: 8,
      },
      {
        id: 10,
        label: "Ajouter un livreur",
        link: "/megafast/drivers/create",
        parentId: 8,
      },
    ],
  },

  {
    id: 23,
    label: "Utilisateurs",
    icon: "bx-user-circle",
    link: "/megafast/users",
  },

  // Temporairement désactivé - Facturation, Comptabilité, Paie, Congés et Statistiques
  // { id: 14, label: 'Facturation',  icon: 'bx-receipt',       link: '/megafast/facturation' },
  // { id: 15, label: 'Comptabilité', icon: 'bx-book-content',  link: '/megafast/comptabilite' },
  // { id: 16, label: 'Paie',         icon: 'bx-credit-card',   link: '/megafast/paie' },

  // {
  //   id: 17,
  //   label: 'Congés',
  //   icon: 'bx-calendar',
  //   subItems: [
  //     // routes MEGAFAST_ROUTES: 'leaves/...'
  //     { id: 18, label: 'Demandes & validation', link: '/megafast/leaves/requests',   parentId: 17 },
  //     { id: 19, label: 'Catégories',            link: '/megafast/leaves/categories', parentId: 17 },
  //     { id: 20, label: 'Calendrier',            link: '/megafast/leaves/calendar',   parentId: 17 },
  //   ]
  // },

  // { id: 21, label: 'Statistiques', icon: 'bx-bar-chart-alt-2', link: '/megafast/stats' },
];

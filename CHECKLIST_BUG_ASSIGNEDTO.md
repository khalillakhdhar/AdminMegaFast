# Checklist — Vérification bug « Cannot find control with name: 'assignedTo' »

Objectif: confirmer que l’erreur ne se reproduit plus après l’initialisation anticipée du `filterForm` sur la page liste colis (admin).

## A) Repro rapide (admin)
1. Lancer l’app en dev.
2. Se connecter en **admin**.
3. Aller sur `/megafast/colis`.
4. Vérifier:
   - La page s’affiche sans erreur console.
   - Le filtre “Livreur” (champ `assignedTo`) s’affiche.

## B) Navigation vers create
1. Depuis `/megafast/colis`, cliquer “Nouveau Colis” (route `/megafast/colis/create`).
2. Rafraîchir (F5) sur `/megafast/colis/create`.
3. Vérifier:
   - Aucune erreur « Cannot find control with name: 'assignedTo' ».

## C) Navigation inverse
1. Depuis `/megafast/colis/create`, revenir à la liste colis.
2. Vérifier:
   - Aucune erreur console au retour.

## D) Si l’erreur persiste
Collecter:
- Le stacktrace complet (composant et template en cause)
- La route exacte au moment de l’erreur

Pistes typiques:
- Template rendu alors que `FormGroup` non initialisé (timing)
- Composant de layout qui instancie un bout de template “liste” (ex: sidebar ou header)
- Un `*ngIf` manquant autour du `<form [formGroup]>`

/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    panelUser?: import('./lib/panelAuth').PanelSession;
  }
}

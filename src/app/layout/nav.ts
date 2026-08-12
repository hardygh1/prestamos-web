import { INavData } from '@coreui/angular';

// Nota: usar `iconComponent: { name }` (icono SVG registrado en IconSetService),
// no `icon: 'cilX'` -- ese campo espera una clase CSS de una fuente de iconos
// (que no tenemos instalada) y renderiza un <span> vacio sin glifo visible.
export const navItems: INavData[] = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    iconComponent: { name: 'cilSpeedometer' },
  },
  {
    name: 'Clientes',
    url: '/clientes',
    iconComponent: { name: 'cilPeople' },
  },
  {
    name: 'Cotizaciones',
    url: '/cotizaciones',
    iconComponent: { name: 'cilCalculator' },
  },
  {
    name: 'Prestamos',
    url: '/prestamos',
    iconComponent: { name: 'cilBank' },
  },
  {
    name: 'Pagos',
    url: '/pagos',
    iconComponent: { name: 'cilCash' },
  },
];

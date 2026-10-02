export const CONTACT = {
  email: 'jenny.quevedo@nousestrategia.com',
  phoneHref: 'tel:+573102371221',
  whatsappHref:
    'https://wa.me/573102371221?text=Hola,%20me%20gustaria%20agendar%20una%20consulta%20con%20NOUS%20Estrategia.',
  // The city in the footer sits under two real links and is styled like them, so it leads somewhere too.
  // A fixed query rather than the translated city string, so the destination cannot change with language.
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Bogot%C3%A1%2C%20Colombia',
};

export const BRAND = {
  gold: '#E3B98A',
  cyan: '#6EC6E0',
  blue: '#2E74C9',
  indigo: '#4A4FA0',
  violet: '#7C5AA6',
} as const;

export type IconName = 'chart' | 'megaphone' | 'process' | 'chip' | 'check' | 'arrow';

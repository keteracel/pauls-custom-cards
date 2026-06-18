import './cards/gauge-card/gauge-card.js';

declare global {
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}

window.customCards = window.customCards ?? [];
// Fix #5: guard against double-registration on hot-reload or duplicate resource entries
if (!window.customCards.some(c => c.type === 'paul-gauge-card')) {
  window.customCards.push({
    type: 'paul-gauge-card',
    name: "Paul's Gauge Card",
    description: 'Background-color gauge showing sensor state with configurable level colors and icons.',
    preview: true,
    documentationURL: 'https://github.com/keteracel/pauls-custom-cards',
  });
}

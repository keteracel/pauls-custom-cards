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
window.customCards.push({
  type: 'paul-gauge-card',
  name: "Paul's Gauge Card",
  description: 'Background-color gauge showing sensor state with configurable level colors and icons.',
  preview: true,
  documentationURL: 'https://github.com/keteracel/pauls-custom-cards',
});

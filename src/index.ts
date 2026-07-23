import './cards/gauge-card/gauge-card.js';
import './cards/flow-card/flow-card.js';
import './cards/wind-card/wind-card.js';

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

if (!window.customCards.some(c => c.type === 'paul-flow-card')) {
  window.customCards.push({
    type: 'paul-flow-card',
    name: "Paul's Flow Card",
    description: 'Animated pipe-network diagram for heating/cooling systems with configurable topology.',
    preview: true,
    documentationURL: 'https://github.com/keteracel/pauls-custom-cards',
  });
}

if (!window.customCards.some(c => c.type === 'paul-wind-card')) {
  window.customCards.push({
    type: 'paul-wind-card',
    name: "Paul's Wind Card",
    description: 'Compass card showing wind direction and speed, with optional gust and average readouts.',
    preview: true,
    documentationURL: 'https://github.com/keteracel/pauls-custom-cards',
  });
}

import { Lang } from './translations';

/**
 * One numbered step of a pillar's method, as [number, title, body].
 *
 * A tuple to match `cards` in the same file, and the number is text rather than a figure so the leading
 * zero in "01" survives.
 */
export type ApproachStep = [string, string, string];

export interface PillarApproach {
  steps: ApproachStep[];
  /** The line that closes the section, stating what the work is ultimately for. */
  closing: string;
}

export interface PillarText {
  kicker: string;
  title: string;
  sub: string;
  /** [title, body] pairs */
  cards: [string, string][];
  /** alt text for image media */
  alt?: string;
  /**
   * How this pillar is actually delivered. Where it is absent the page falls back to the shared
   * description, which is the same for every pillar - which is why four pillars read identically
   * until their own method is written.
   */
  approach?: PillarApproach;
}

export const PILLAR_COPY: Record<string, Record<Lang, PillarText>> = {
  finance: {
    en: {
      kicker: 'Pillar 1',
      title: 'Smart Finance & Dashboards',
      sub: 'Turn accounting and financial data into clear, high-value business decisions.',
      cards: [
        [
          'Financial Diagnosis',
          'Review revenue, costs, expenses and cash flow. Identify money leaks and provide an executive findings report.'
        ],
        [
          'Control, Analysis & Visibility',
          'Interactive dashboards showing key KPIs, revenue projections and executive variance analysis.'
        ],
        [
          'Optimization & Standardization',
          'Financial control models plus standardized and automated recurring reports.'
        ],
        [
          'External CFO — CFO as a Service',
          'Strategic planning, investment evaluation, committees and key decisions without a full-time internal CFO.'
        ]
      ]
    },
    es: {
      kicker: 'Pilar 1',
      title: 'Finanzas Inteligentes y Dashboards',
      sub: 'Convertimos los datos contables y financieros en decisiones claras y de alto valor.',
      cards: [
        [
          'Diagnóstico Financiero',
          'Revisión de ingresos, costos, gastos y flujo de caja. Identificamos fugas de dinero y entregamos un informe ejecutivo de hallazgos.'
        ],
        [
          'Control, Análisis y Visibilidad',
          'Tableros interactivos con los principales KPIs, proyecciones de ingresos y análisis ejecutivo de desviaciones.'
        ],
        [
          'Optimización y Estandarización',
          'Modelos de control financiero y reportes recurrentes estandarizados y automatizados.'
        ],
        [
          'CFO Externo — CFO como Servicio',
          'Planeación estratégica, evaluación de inversiones, comités y decisiones clave sin necesidad de un CFO interno de tiempo completo.'
        ]
      ]
    }
  },
  marketing: {
    en: {
      kicker: 'Pillar 2',
      title: 'Digital Marketing & Content Creation',
      sub: 'We build a measurable digital ecosystem connected to sales and profitability.',
      cards: [
        [
          'Web',
          'Website design and development, conversion-focused UX/UI and strategic SEO.'
        ],
        [
          'Social Media',
          'Planning, content calendars and multi-channel social media management.'
        ],
        [
          'Audiovisual & Graphics',
          'On-site or studio recording, video editing, graphic design and brand kits.'
        ],
        [
          'Performance Campaigns',
          'Paid campaigns focused on acquiring qualified customers, with clear ROI metrics.'
        ]
      ],
      approach: {
        steps: [
          ['01', 'Diagnosis and target audience',
           'We analyse your value proposition, identify your ideal customer profile and audit your current digital channels.'],
          ['02', 'Strategy and content deployment', 'We design the architecture you need.'],
          ['03', 'Measurement and optimisation', 'We monitor key metrics through dashboards.'],
        ],
        closing: 'Effective marketing does more than attract attention: it builds a predictable revenue stream and positions your brand.'
      }
    },
    es: {
      kicker: 'Pilar 2',
      title: 'Marketing Digital y Creación de Contenido',
      sub: 'Construimos un ecosistema digital medible conectado con las ventas y la rentabilidad.',
      cards: [
        [
          'Web',
          'Diseño y desarrollo de sitios web, UX/UI enfocado en conversión y SEO estratégico.'
        ],
        [
          'Redes Sociales',
          'Planeación, calendarios de contenido y gestión de redes sociales en múltiples canales.'
        ],
        [
          'Audiovisual y Gráfico',
          'Grabación en sitio o en estudio, edición de video, diseño gráfico y kits de marca.'
        ],
        [
          'Campañas de Performance',
          'Campañas pagas enfocadas en adquirir clientes calificados, con métricas de ROI claras.'
        ]
      ],
      approach: {
        steps: [
          ['01', 'Diagnóstico y público objetivo',
           'Analizamos tu propuesta de valor, identificamos tu perfil de cliente ideal y auditamos tus canales digitales actuales.'],
          ['02', 'Estrategia y despliegue de contenido', 'Diseñamos la arquitectura que necesitas.'],
          ['03', 'Medición y optimización', 'Monitoreamos las métricas clave mediante dashboards.'],
        ],
        closing: 'El marketing efectivo no solo atrae atención: construye un flujo de ingresos predecible y posiciona tu marca.'
      }
    }
  },
  process: {
    en: {
      kicker: 'Pillar 3',
      title: 'Strategic Control & Process Improvement',
      sub: 'Diagnose operational processes to remove bottlenecks, reduce costs and increase profit margins.',
      cards: [
        [
          'Operational Process Diagnosis',
          'Map workflows and identify operational friction.'
        ],
        [
          'Internal Control & Risk Matrix',
          'Implement financial and operational risk-management methods.'
        ],
        [
          'Reengineering Recommendations',
          'Redesign workflows to maximize productivity in key business areas.'
        ],
        [
          'Business Sustainability',
          'Governance models that support long-term stability and scalability.'
        ]
      ],
      alt: 'Process review with a checklist',
      approach: {
        steps: [
          ['01', 'Mapping and diagnosis',
           'We audit operational workflows and the roles matrix to identify bottlenecks, duplicated tasks and lost productivity.'],
          ['02', 'Control and risk management design', 'We structure policies, key indicators and risk maps.'],
          ['03', 'Reengineering and scalability', 'We redesign processes to integrate automation tools.'],
        ],
        closing: 'Strategy defines the direction of the company.'
      }
    },
    es: {
      kicker: 'Pilar 3',
      title: 'Control Estratégico y Mejora de Procesos',
      sub: 'Diagnosticamos los procesos operativos para eliminar cuellos de botella, reducir costos y aumentar los márgenes de utilidad.',
      alt: 'Revisión de procesos con una lista de verificación',
      cards: [
        [
          'Diagnóstico de Procesos Operativos',
          'Mapeamos los flujos de trabajo e identificamos la fricción operativa.'
        ],
        [
          'Control Interno y Matriz de Riesgos',
          'Implementamos métodos de gestión de riesgos financieros y operativos.'
        ],
        [
          'Recomendaciones de Reingeniería',
          'Rediseñamos los flujos de trabajo para maximizar la productividad en las áreas clave del negocio.'
        ],
        [
          'Sostenibilidad Empresarial',
          'Modelos de gobierno que respaldan la estabilidad y la escalabilidad a largo plazo.'
        ]
      ],
      approach: {
        steps: [
          ['01', 'Mapeo y diagnóstico',
           'Auditamos los flujos de trabajo operativos y la matriz de roles para identificar cuellos de botella, duplicación de tareas y pérdidas de productividad.'],
          ['02', 'Diseño de control y gestión de riesgos', 'Estructuramos políticas, indicadores clave y mapas de riesgo.'],
          ['03', 'Reingeniería y escalabilidad', 'Rediseñamos los procesos para integrar herramientas de automatización.'],
        ],
        closing: 'La estrategia define el rumbo de la compañía.'
      }
    }
  },
  ai: {
    en: {
      kicker: 'Pillar 4',
      title: 'AI & Process Automation',
      sub: 'Combine AI and automation to transform repetitive manual tasks into agile and profitable processes.',
      cards: [
        [
          'Workflow Automation',
          'Connect operational, commercial and administrative tools to reduce response times.'
        ],
        [
          'Predictive Models & Data Intelligence',
          'AI assistants and data tools for faster executive decisions.'
        ],
        [
          'Automated Reports',
          'Generate management information in real time without manual intervention.'
        ],
        [
          'Digital Training & Adoption',
          'Help teams adopt AI and a digital culture through training and guidance.'
        ]
      ],
      approach: {
        steps: [
          ['01', 'Diagnosis', 'We map the manual and repetitive tasks.'],
          ['02', 'Architecture, integration and AI agents',
           'We define the best solution, whether that means building on the systems you already have or implementing the most cost-effective, service-oriented option for your company.'],
          ['03', 'Governance and training', 'We train your teams so the change is adopted culturally, not just installed.'],
        ],
        closing: 'Artificial intelligence does not replace human vision: it strengthens it.'
      }
    },
    es: {
      kicker: 'Pilar 4',
      title: 'IA y Automatización de Procesos',
      sub: 'Combinamos IA y automatización para transformar tareas manuales repetitivas en procesos ágiles y rentables.',
      cards: [
        [
          'Automatización de Flujos de Trabajo',
          'Conectamos herramientas operativas, comerciales y administrativas para reducir los tiempos de respuesta.'
        ],
        [
          'Modelos Predictivos e Inteligencia de Datos',
          'Asistentes de IA y herramientas de datos para decisiones ejecutivas más rápidas.'
        ],
        [
          'Reportes Automatizados',
          'Generamos información gerencial en tiempo real sin intervención manual.'
        ],
        [
          'Capacitación y Adopción Digital',
          'Ayudamos a los equipos a adoptar la IA y una cultura digital mediante capacitación y acompañamiento.'
        ]
      ],
      approach: {
        steps: [
          ['01', 'Diagnóstico', 'Mapeamos las tareas manuales y repetitivas.'],
          ['02', 'Arquitectura, integración y agentes de IA',
           'Definimos la mejor solución, ya sea aprovechando los sistemas que ya tienes o implementando la opción más rentable y orientada al servicio para tu empresa.'],
          ['03', 'Gobernanza y formación', 'Capacitamos a tus equipos para que el cambio se adopte culturalmente, no solo se instale.'],
        ],
        closing: 'La inteligencia artificial no reemplaza la visión humana: la fortalece.'
      }
    }
  }
};

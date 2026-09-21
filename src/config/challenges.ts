// Único archivo a editar para cambiar el contenido de los desafíos.
// Cada grupo puede tener una cantidad distinta de desafíos si hace falta —
// el resto de la app (contador, ids, etc.) se adapta solo a challenges.length.

export type Grupo = 'A' | 'B' | 'C' | 'D' | 'E';

export interface Challenge {
  id: string;
  grupo: Grupo;
  numero: number;
  title: string;
  description: string;
}

interface RawChallenge {
  title: string;
  description: string;
}

const RAW: Record<Grupo, RawChallenge[]> = {
  A: [
    {
      title: 'CRUCE DE GRUPOS',
      description: 'Capturá a personas de distintos grupos de amigos o familias compartiendo un momento.',
    },
    {
      title: 'EL ABRAZO MÁS EMOTIVO',
      description: 'Capturá un abrazo espontáneo lleno de cariño o emoción.',
    },
    {
      title: 'EL LOOK MÁS JUGADO',
      description: 'Encontrá el accesorio, vestido o traje más original de la fiesta y fotografialo.',
    },
    {
      title: 'ALGO QUE NO DEBERÍA ESTAR ACÁ',
      description: 'Capturá un objeto, situación o detalle que parezca completamente fuera de lugar.',
    },
    {
      title: 'POSE DE ALFOMBRA ROJA',
      description: 'Juntá un grupo y hagan su mejor pose de modelos o celebridades.',
    },
    {
      title: 'LA PAPRI DE ESTA NOCHE',
      description:
        'Sacate una foto con la mismísima Papri. Pista: no esperes encontrar un perro caminando por la fiesta.',
    },
  ],
  B: [
    {
      title: 'CÓRDOBA + BUENOS AIRES',
      description:
        'Encontrá a alguien que viva en Córdoba y a alguien que viva en Buenos Aires. Foto juntos como si fueran amigos de toda la vida.',
    },
    {
      title: 'LA MEJOR RISA',
      description: 'Capturá a alguien tentado de risa en pleno festejo.',
    },
    {
      title: 'EL TATUAJE ESCONDIDO',
      description: 'Encontrá el tatuaje más original o llamativo entre los invitados y fotografialo.',
    },
    {
      title: 'GATO POR LIEBRE',
      description: 'Sacá una foto donde algo parezca una cosa… pero en realidad sea otra.',
    },
    {
      title: 'FOTO DE TURISTA',
      description:
        'Sacate una foto como si Altos Eventos fuera una maravilla del mundo que viajaste miles de kilómetros para conocer.',
    },
    {
      title: 'CORDOBÉS POR UN RATO',
      description:
        'Sacá una foto que, sin mostrar carteles ni ubicaciones, demuestre que este casamiento está sucediendo en Córdoba.',
    },
  ],
  C: [
    {
      title: 'EL MÁS VIAJERO',
      description:
        'Encontrá a quien haya viajado desde más lejos para estar en el casamiento y tómense una foto brindando.',
    },
    {
      title: 'SORPRENDIDOS IN FRAGANTI',
      description: 'Capturá a alguien comiendo, riendo o distraído sin que pose para la foto.',
    },
    {
      title: 'PARECIDOS RAZONABLES',
      description: 'Encontrá a dos invitados que podrían pasar por hermanos aunque no lo sean.',
    },
    {
      title: 'EL DETALLE QUE NADIE VIO',
      description:
        'Encontrá un detalle del casamiento que creas que la mayoría todavía no notó. Cuanto más escondido, mejor.',
    },
    {
      title: 'EL MOMENTO JUSTO',
      description:
        'Capturá a alguien en el aire: saltando, bailando o en pleno movimiento. No vale simplemente levantar un pie.',
    },
    {
      title: 'SE VIENE EL FRÍO',
      description:
        'Encontrá la estrategia más creativa de alguien para combatir el fresco. No necesariamente tiene que ser una manta.',
    },
  ],
  D: [
    {
      title: 'ADOPCIÓN TEMPORAL',
      description:
        'Encontrá a alguien que haya sido adoptado por un grupo que no es el suyo y sacale una foto con su nueva familia.',
    },
    {
      title: 'MAÑANA HAY EVIDENCIA',
      description: 'Capturá un momento espontáneo que mañana haga preguntar: "¿En qué momento pasó esto?".',
    },
    {
      title: 'EL COLECCIONISTA DE TRAGOS',
      description: 'Encontrá a alguien con dos bebidas o vasos en la mano al mismo tiempo y sacale una foto.',
    },
    {
      title: 'CASI PERFECTA',
      description:
        'Encontrá una escena hermosa o romántica con un pequeño detalle arruinándola. No vale preparar el sabotaje.',
    },
    {
      title: 'NO SOBREVIVIÓ A LA FIESTA',
      description:
        'Encontrá algo que haya empezado la boda impecable y que claramente ya esté sufriendo las consecuencias.',
    },
    {
      title: 'LA PREVIA DEL DESASTRE',
      description: 'Capturá a alguien estudiando la torre del Jenga con una concentración completamente desproporcionada.',
    },
  ],
  E: [
    {
      title: 'EFECTO PAPRI',
      description:
        'Juntá a tres personas que tengan mascota. Cada una debe mostrar una foto de ella en el celular y posar como orgullosos padres de familia.',
    },
    {
      title: 'CÓMPLICES DEL AMOR',
      description: 'Capturá el mejor beso de la noche. ¡No vale el de los novios!',
    },
    {
      title: 'SELFIE CON LOS NOVIOS',
      description: 'Sacate una selfie divertida con Dani y Wally.',
    },
    {
      title: 'QUE ALGUIEN EXPLIQUE ESTO',
      description: 'Sacá la foto más inexplicable de la noche. No la prepares ni la actúes: encontrala.',
    },
    {
      title: 'LA CALMA ANTES DEL CAOS',
      description: 'Encontrá y fotografiá el rincón más tranquilo de toda la fiesta.',
    },
    {
      title: 'ESTO ES MUY ELLOS',
      description:
        'Encontrá una escena, objeto o momento que te haga pensar: "Esto es muy Dani y Wally". No hay respuesta correcta.',
    },
  ],
};

export const GRUPOS: Grupo[] = ['A', 'B', 'C', 'D', 'E'];

function buildChallenges(): Record<Grupo, Challenge[]> {
  const result = {} as Record<Grupo, Challenge[]>;
  for (const grupo of GRUPOS) {
    result[grupo] = RAW[grupo].map((c, i) => ({
      id: `${grupo}${String(i + 1).padStart(2, '0')}`,
      grupo,
      numero: i + 1,
      title: c.title,
      description: c.description,
    }));
  }
  return result;
}

export const CHALLENGES: Record<Grupo, Challenge[]> = buildChallenges();

export function isGrupo(value: string | null | undefined): value is Grupo {
  return !!value && (GRUPOS as string[]).includes(value);
}

export function getChallengesForGrupo(grupo: Grupo): Challenge[] {
  return CHALLENGES[grupo];
}

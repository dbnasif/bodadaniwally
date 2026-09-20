// Único archivo a editar para cambiar los 25 desafíos (5 grupos x 5 desafíos).
// El id de cada desafío se genera solo (A01..A05, B01..B05, etc.), no hace falta tocarlo.

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
    { title: 'DRAMA INNECESARIO', description: 'Convertí una situación completamente normal en una tragedia.' },
    { title: 'ROMANCE INESPERADO', description: 'Hacé parecer romántico algo que definitivamente no lo es.' },
    { title: 'BAILE IMPOSIBLE', description: 'Sacale una foto a alguien con el paso de baile más raro de la noche.' },
    { title: 'BRINDIS SOLEMNE', description: 'Un brindis exageradamente serio, con cara de discurso presidencial.' },
    { title: 'FOTO DE FAMILIA FALSA', description: 'Armá una "foto familiar" con gente que recién conociste esta noche.' },
  ],
  B: [
    { title: 'IMITACIÓN DE LOS NOVIOS', description: 'Alguien imitando la pose de casamiento de Dani & Wally.' },
    { title: 'EL MEJOR ZAPATO', description: 'Una foto artística centrada 100% en un zapato de la fiesta.' },
    { title: 'RISA CONGELADA', description: 'Capturá a alguien en pleno ataque de risa, a mitad de carcajada.' },
    { title: 'BRINDIS EN EQUIPO', description: 'Reuní a un grupo entero brindando a la cámara al mismo tiempo.' },
    { title: 'MIRADA DE REVISTA', description: 'Una foto tipo "portada de revista de moda" con lo que tengas a mano.' },
  ],
  C: [
    { title: 'ABRAZO GRUPAL', description: 'El abrazo grupal más grande que puedas armar en 30 segundos.' },
    { title: 'BAILE CONGELADO', description: 'Todos en la pista congelados a mitad de movimiento, como pausados.' },
    { title: 'PISTA A FULL', description: 'Una foto de la pista de baile en su momento más lleno.' },
    { title: 'BESO A LA CÁMARA', description: 'Un beso volador dedicado directo a la cámara.' },
    { title: 'BRINDIS SECRETO', description: 'Un brindis clandestino, como si fuera un plan secreto entre amigos.' },
  ],
  D: [
    { title: 'DOBLE DE LOS NOVIOS', description: 'Alguien haciendo de "doble de riesgo" de Dani o Wally por un segundo.' },
    { title: 'FOTO DESDE ABAJO', description: 'Una foto tomada desde el piso mirando hacia arriba, bien dramática.' },
    { title: 'APROBADO POR EL DJ', description: 'Una foto con cara de aprobación total a lo que está sonando.' },
    { title: 'LA MESA MÁS DIVERTIDA', description: 'Demostrá con una foto por qué tu mesa es la mejor de la noche.' },
    { title: 'SELFIE INESPERADA', description: 'Una selfie grupal con alguien que no esperabas que aparezca.' },
  ],
  E: [
    { title: 'ELEGANCIA EXAGERADA', description: 'Una pose exageradamente elegante, como si fueran realeza.' },
    { title: 'BRINDIS AL CIELO', description: 'Una copa brindando mirando al cielo o a las luces de la fiesta.' },
    { title: 'DÚO DINÁMICO', description: 'Encontrá a la dupla más divertida de la fiesta y sacale una foto.' },
    { title: 'ÚLTIMA HORA', description: 'Una foto que resuma el espíritu de la fiesta ya bien entrada la noche.' },
    { title: 'PAPRI HONORARIO', description: 'Encontrá algo en la fiesta que se parezca, aunque sea un poco, a Papri.' },
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

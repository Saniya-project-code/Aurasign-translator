// High-fidelity pre-seeded landmark configurations for ASL letters and vocabulary gestures.
// Each template includes the expected finger extension states [Thumb, Index, Middle, Ring, Pinky]
// and 21 wrist-normalized coordinates to enable precise Euclidean-distance matching.

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface GestureTemplate {
  name: string;
  fingerExtensions: [number, number, number, number, number]; // 0 = curled, 1 = extended
  description: string;
  // Normalized 21-landmark coordinate templates for precise spatial checking
  landmarks: Point3D[];
}

// Helper to generate a generic flat coordinate template for a hand shape
function generateBaseHand(
  fingerStates: [number, number, number, number, number]
): Point3D[] {
  const points: Point3D[] = [];
  
  // 0: Wrist
  points.push({ x: 0, y: 0, z: 0 });
  
  // 1-4: Thumb
  const thumbExt = fingerStates[0];
  points.push({ x: thumbExt ? -0.2 : -0.1, y: -0.1, z: 0 });
  points.push({ x: thumbExt ? -0.35 : -0.15, y: -0.2, z: 0 });
  points.push({ x: thumbExt ? -0.45 : -0.18, y: -0.28, z: 0 });
  points.push({ x: thumbExt ? -0.55 : -0.2, y: -0.35, z: 0 }); // Thumb Tip (4)

  // 5-8: Index Finger
  const indexExt = fingerStates[1];
  points.push({ x: -0.15, y: -0.3, z: 0 });
  points.push({ x: -0.16, y: -0.45, z: 0 });
  points.push({ x: -0.17, y: -0.6, z: 0 });
  points.push({ x: -0.18, y: indexExt ? -0.8 : -0.4, z: 0 }); // Index Tip (8)

  // 9-12: Middle Finger
  const middleExt = fingerStates[2];
  points.push({ x: -0.02, y: -0.32, z: 0 });
  points.push({ x: -0.02, y: -0.48, z: 0 });
  points.push({ x: -0.02, y: -0.64, z: 0 });
  points.push({ x: -0.02, y: middleExt ? -0.85 : -0.42, z: 0 }); // Middle Tip (12)

  // 13-16: Ring Finger
  const ringExt = fingerStates[3];
  points.push({ x: 0.1, y: -0.3, z: 0 });
  points.push({ x: 0.11, y: -0.45, z: 0 });
  points.push({ x: 0.12, y: -0.6, z: 0 });
  points.push({ x: 0.13, y: ringExt ? -0.8 : -0.4, z: 0 }); // Ring Tip (16)

  // 17-20: Pinky Finger
  const pinkyExt = fingerStates[4];
  points.push({ x: 0.22, y: -0.25, z: 0 });
  points.push({ x: 0.24, y: -0.38, z: 0 });
  points.push({ x: 0.26, y: -0.5, z: 0 });
  points.push({ x: 0.28, y: pinkyExt ? -0.7 : -0.33, z: 0 }); // Pinky Tip (20)

  return points;
}

export const PRESEEDED_GESTURES: GestureTemplate[] = [
  {
    name: "A",
    fingerExtensions: [0, 0, 0, 0, 0], // Fist
    description: "Closed fist (ASL Letter A / 'Yes')",
    landmarks: generateBaseHand([0, 0, 0, 0, 0])
  },
  {
    name: "B",
    fingerExtensions: [0, 1, 1, 1, 1], // Open hand, thumb folded
    description: "Flat open hand (ASL Letter B / 'Hello')",
    landmarks: generateBaseHand([0, 1, 1, 1, 1])
  },
  {
    name: "C",
    fingerExtensions: [1, 1, 1, 1, 1], // Hand curved, but classified via thumb and index bend
    description: "Curved shape (ASL Letter C)",
    landmarks: [
      { x: 0, y: 0, z: 0 },
      { x: -0.15, y: -0.05, z: 0 }, { x: -0.25, y: -0.12, z: 0 }, { x: -0.32, y: -0.2, z: 0 }, { x: -0.35, y: -0.28, z: 0 }, // Curved thumb
      { x: -0.1, y: -0.25, z: 0 }, { x: -0.18, y: -0.4, z: 0 }, { x: -0.18, y: -0.48, z: 0 }, { x: -0.15, y: -0.55, z: 0 }, // Curved index
      { x: 0, y: -0.26, z: 0 }, { x: -0.05, y: -0.41, z: 0 }, { x: -0.05, y: -0.49, z: 0 }, { x: -0.02, y: -0.56, z: 0 },  // Curved middle
      { x: 0.1, y: -0.25, z: 0 }, { x: 0.08, y: -0.38, z: 0 }, { x: 0.08, y: -0.46, z: 0 }, { x: 0.1, y: -0.53, z: 0 },   // Curved ring
      { x: 0.18, y: -0.2, z: 0 }, { x: 0.18, y: -0.32, z: 0 }, { x: 0.18, y: -0.4, z: 0 }, { x: 0.2, y: -0.48, z: 0 }     // Curved pinky
    ]
  },
  {
    name: "D",
    fingerExtensions: [0, 1, 0, 0, 0], // Index straight up, others meet thumb
    description: "Pointing up (ASL Letter D / 'Point')",
    landmarks: generateBaseHand([0, 1, 0, 0, 0])
  },
  {
    name: "I",
    fingerExtensions: [0, 0, 0, 0, 1], // Pinky extended
    description: "Pinky out (ASL Letter I)",
    landmarks: generateBaseHand([0, 0, 0, 0, 1])
  },
  {
    name: "L",
    fingerExtensions: [1, 1, 0, 0, 0], // Thumb and Index extended
    description: "L-shape (ASL Letter L)",
    landmarks: generateBaseHand([1, 1, 0, 0, 0])
  },
  {
    name: "V",
    fingerExtensions: [0, 1, 1, 0, 0], // Index and Middle extended
    description: "V-shape / Peace (ASL Letter V)",
    landmarks: generateBaseHand([0, 1, 1, 0, 0])
  },
  {
    name: "W",
    fingerExtensions: [0, 1, 1, 1, 0], // Index, Middle, Ring extended
    description: "W-shape (ASL Letter W)",
    landmarks: generateBaseHand([0, 1, 1, 1, 0])
  },
  {
    name: "Y",
    fingerExtensions: [1, 0, 0, 0, 1], // Thumb and Pinky extended
    description: "Shaka / Y-shape (ASL Letter Y / 'Call me')",
    landmarks: generateBaseHand([1, 0, 0, 0, 1])
  },
  {
    name: "Hello",
    fingerExtensions: [1, 1, 1, 1, 1], // Full open hand
    description: "Wave gesture ('Hello' / 'Goodbye')",
    landmarks: generateBaseHand([1, 1, 1, 1, 1])
  },
  {
    name: "Thank You",
    fingerExtensions: [0, 1, 1, 1, 1], // Flat palm, thumb close
    description: "Hand flat pointing forward ('Thank You')",
    landmarks: generateBaseHand([0, 1, 1, 1, 1])
  },
  {
    name: "Yes",
    fingerExtensions: [0, 0, 0, 0, 0], // Fist (tilted)
    description: "Closed fist nodding ('Yes')",
    landmarks: generateBaseHand([0, 0, 0, 0, 0])
  },
  {
    name: "No",
    fingerExtensions: [0, 1, 1, 0, 0], // Index & Middle pointing forward together
    description: "Two fingers touching thumb ('No')",
    landmarks: [
      { x: 0, y: 0, z: 0 },
      { x: -0.15, y: -0.1, z: 0 }, { x: -0.2, y: -0.2, z: 0 }, { x: -0.22, y: -0.28, z: 0 }, { x: -0.2, y: -0.32, z: 0 }, // Curved thumb
      { x: -0.1, y: -0.25, z: 0 }, { x: -0.18, y: -0.38, z: 0 }, { x: -0.2, y: -0.42, z: 0 }, { x: -0.18, y: -0.32, z: 0 }, // Closed index meeting thumb
      { x: 0, y: -0.26, z: 0 }, { x: -0.05, y: -0.39, z: 0 }, { x: -0.08, y: -0.43, z: 0 }, { x: -0.08, y: -0.33, z: 0 },  // Closed middle meeting thumb
      { x: 0.1, y: -0.25, z: 0 }, { x: 0.08, y: -0.36, z: 0 }, { x: 0.08, y: -0.42, z: 0 }, { x: 0.1, y: -0.38, z: 0 },   // Curved ring
      { x: 0.18, y: -0.2, z: 0 }, { x: 0.18, y: -0.3, z: 0 }, { x: 0.18, y: -0.36, z: 0 }, { x: 0.2, y: -0.34, z: 0 }     // Curved pinky
    ]
  }
];

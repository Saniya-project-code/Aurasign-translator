import type { Point3D, GestureTemplate } from "./aslLandmarks";
import { PRESEEDED_GESTURES } from "./aslLandmarks";

// Calculate Euclidean distance between two 3D points
export function distance3D(p1: Point3D, p2: Point3D): number {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
}

// Normalize a hand's 21 landmarks:
// 1. Translates all points so the wrist (index 0) is at (0, 0, 0)
// 2. Scales all coordinates so that the max distance from wrist to any joint is 1.0 (scale-invariance)
export function normalizeLandmarks(landmarks: Point3D[]): Point3D[] {
  if (landmarks.length < 21) return [];

  const wrist = landmarks[0];
  
  // 1. Shift relative to wrist
  const shifted = landmarks.map(p => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: p.z - wrist.z
  }));

  // 2. Find max distance from wrist
  let maxDist = 0;
  for (let i = 1; i < shifted.length; i++) {
    const dist = Math.sqrt(
      shifted[i].x * shifted[i].x +
      shifted[i].y * shifted[i].y +
      shifted[i].z * shifted[i].z
    );
    if (dist > maxDist) {
      maxDist = dist;
    }
  }

  // Avoid division by zero
  const scale = maxDist > 0 ? maxDist : 1;

  // 3. Scale points
  return shifted.map(p => ({
    x: p.x / scale,
    y: p.y / scale,
    z: p.z / scale
  }));
}

// Determine finger extension states geometrically
// Returns an array of [Thumb, Index, Middle, Ring, Pinky] (1 = extended, 0 = curled)
export function detectFingerExtensions(
  landmarks: Point3D[]
): [number, number, number, number, number] {
  if (landmarks.length < 21) return [0, 0, 0, 0, 0];

  const wrist = landmarks[0];
  
  const getDist = (p1: Point3D, p2: Point3D) => distance3D(p1, p2);

  // Helper to determine if finger is extended
  // Checks if distance from wrist to tip is greater than distance from wrist to the pip/joint
  const isExtended = (tipIdx: number, baseIdx: number, pipIdx: number): number => {
    const tipDist = getDist(landmarks[tipIdx], wrist);
    const baseDist = getDist(landmarks[baseIdx], wrist);
    const pipDist = getDist(landmarks[pipIdx], wrist);
    
    // Tip must be further from wrist than the PIP joint
    return (tipDist > pipDist * 1.08 && tipDist > baseDist * 1.15) ? 1 : 0;
  };

  // Thumb: joint 4 (tip) vs joint 2 (base) and joint 3. 
  // Thumb is extended if it stretches outward horizontally or vertically
  const thumbTip = landmarks[4];
  const thumbBase = landmarks[2];
  const indexBase = landmarks[5];
  const thumbExtended = getDist(thumbTip, indexBase) > getDist(thumbBase, indexBase) * 1.3 ? 1 : 0;

  const indexExtended = isExtended(8, 5, 6);
  const middleExtended = isExtended(12, 9, 10);
  const ringExtended = isExtended(16, 13, 14);
  const pinkyExtended = isExtended(20, 17, 18);

  return [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended];
}

export interface ClassificationResult {
  label: string;
  confidence: number;
  fingerExtensions: [number, number, number, number, number];
}

// Classify the hand's posture using pre-seeded templates + user-trained templates
export function classifyGesture(
  rawLandmarks: Point3D[],
  customTemplates: GestureTemplate[] = []
): ClassificationResult {
  const normalized = normalizeLandmarks(rawLandmarks);
  const detectedExtensions = detectFingerExtensions(rawLandmarks);

  if (normalized.length < 21) {
    return { label: "Unknown", confidence: 0, fingerExtensions: [0, 0, 0, 0, 0] };
  }

  const allTemplates = [...customTemplates, ...PRESEEDED_GESTURES];
  
  let bestMatch: GestureTemplate | null = null;
  let minDiff = Infinity;

  for (const template of allTemplates) {
    // 1. Primary Filter: check if finger extensions match
    let extMatchCount = 0;
    for (let i = 0; i < 5; i++) {
      if (template.fingerExtensions[i] === detectedExtensions[i]) {
        extMatchCount++;
      }
    }
    
    // We allow a tolerance of 1 finger mismatch for robustness, but prioritize exact matches
    const extMismatchPenalty = (5 - extMatchCount) * 0.4;

    // 2. Spatial coordinate difference calculation
    let spatialDiff = 0;
    for (let i = 0; i < 21; i++) {
      spatialDiff += distance3D(normalized[i], template.landmarks[i]);
    }

    const totalDiff = spatialDiff + extMismatchPenalty;

    if (totalDiff < minDiff) {
      minDiff = totalDiff;
      bestMatch = template;
    }
  }

  // Convert difference score to confidence percentage (0% - 100%)
  // Under perfect match, minDiff is ~0. With noise/slight differences, it's 0.2 - 1.5
  let confidence = 0;
  if (bestMatch) {
    // Tweak parameters for hackathon demo to be responsive but accurate
    confidence = Math.max(0, Math.min(100, Math.round(100 - minDiff * 24)));
    
    // If it's a perfect finger extension match, boost confidence
    const extensionMatch = bestMatch.fingerExtensions.every((ext, i) => ext === detectedExtensions[i]);
    if (extensionMatch) {
      confidence = Math.min(100, confidence + 8);
    } else {
      // If extensions don't match, cap confidence
      confidence = Math.min(65, confidence);
    }
  }

  return {
    label: bestMatch ? bestMatch.name : "Unknown",
    confidence: bestMatch ? confidence : 0,
    fingerExtensions: detectedExtensions
  };
}

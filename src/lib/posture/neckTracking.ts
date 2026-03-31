export const checkNeckPitch = (nose: any, leftEar: any, rightEar: any) => {
  const earMidY = (leftEar.y + rightEar.y) / 2;
  
  // Nose Y < Ear Y means looking up (extension)
  // Nose Y > Ear Y means looking down (flexion)
  // Note: Y goes from 0 (top) to 1 (bottom)
  const pitchDiff = nose.y - earMidY;
  
  return {
    pitchDiff,
    isLookingUp: pitchDiff < -0.25, // Further relaxed
    isLookingDown: pitchDiff > 0.35, // Further relaxed
  };
};

export const checkNeckRotation = (nose: any, leftEar: any, rightEar: any) => {
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const rotationDiff = Math.abs(nose.x - earMidX);
  
  return {
    rotationDiff,
    isRotated: rotationDiff > 0.15, // Further relaxed
  };
};

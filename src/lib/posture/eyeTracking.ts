export const checkEyeDistance = (leftEye: any, rightEye: any) => {
  const eyeDistance = Math.sqrt(
    Math.pow(leftEye.x - rightEye.x, 2) + Math.pow(leftEye.y - rightEye.y, 2)
  );
  
  // If eyeDistance < 0.05, user is too far (approx > 3 feet)
  // If eyeDistance > 0.30, user is too close (approx 1 foot)
  return {
    distance: eyeDistance,
    isTooClose: eyeDistance > 0.30,
    isWarningClose: eyeDistance > 0.20,
    isTooFar: eyeDistance < 0.05
  };
};

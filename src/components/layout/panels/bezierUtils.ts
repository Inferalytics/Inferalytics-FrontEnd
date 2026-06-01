export const getBezierPath = (ax: number, ay: number, bx: number, by: number): string => {
  const startX = ax + 200;
  const startY = ay + 45;
  const endX = bx;
  const endY = by + 45;
  const mx = (startX + endX) / 2;
  return `M ${startX},${startY} C ${mx},${startY} ${mx},${endY} ${endX},${endY}`;
};

export const getVerticalBezierPath = (ax: number, ay: number, bx: number, by: number): string => {
  const startX = ax + 100;
  const startY = ay + 90;
  const endX = bx + 100;
  const endY = by;
  const my = (startY + endY) / 2;
  return `M ${startX},${startY} C ${startX},${my} ${endX},${my} ${endX},${endY}`;
};

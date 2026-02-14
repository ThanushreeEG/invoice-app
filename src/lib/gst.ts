export function calculateGST(baseAmount: number, cgstRate = 9, sgstRate = 9) {
  // Work in paise (integers) to avoid floating-point drift
  const basePaise = Math.round(baseAmount * 100);
  const totalGstPaise = Math.round(basePaise * (cgstRate + sgstRate) / 100);
  const cgstPaise = Math.ceil(basePaise * cgstRate / 100);
  const sgstPaise = totalGstPaise - cgstPaise;

  return {
    baseAmount,
    cgst: cgstPaise / 100,
    sgst: sgstPaise / 100,
    totalGST: totalGstPaise / 100,
    total: (basePaise + totalGstPaise) / 100,
  };
}

import { createHash } from 'node:crypto';

export const canApproveMissing = profile => profile?.role === 'admin' && profile.active !== false && profile.email?.toLowerCase() === 'vinay@techmigos.com';
export function transactionFingerprint(transaction) {
  const fields = Object.keys(transaction).filter(key => key !== 'proofIds').sort();
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(fields.map(key => [key, transaction[key]])))).digest('hex');
}
export function validateApprovalImages(images) {
  if (!images || Object.keys(images).some(key => !['signatureDataUrl', 'stampDataUrl'].includes(key))) throw Error('Invalid approval images.');
  for (const key of ['signatureDataUrl', 'stampDataUrl']) {
    if (typeof images[key] !== 'string' || images[key].length > 200000 || (images[key] && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(images[key]))) throw Error('Approval images must be embedded PNG or JPEG files.');
  }
}
export function makeApprovalDraft(state, transactionId, profile, { id, approvedAt, reason }) {
  if (!canApproveMissing(profile)) throw Error('Only Vinay’s administrator account can approve missing proofs.');
  const transaction = state.transactions.find(record => record.id === transactionId);
  if (!transaction || transaction.proofIds.length) throw Error('Approval is available only for transactions marked Missing.');
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) throw Error('Explain why the original receipt is missing (up to 1,000 characters).');
  const project = state.projects.find(record => record.id === transaction.projectId);
  const images = state.settings.approvalImages || { signatureDataUrl: project?.invoiceTemplate?.signatureDataUrl || state.projects.find(record => record.invoiceTemplate?.signatureDataUrl)?.invoiceTemplate.signatureDataUrl || '', stampDataUrl: '' };
  validateApprovalImages(images);
  if (!images.signatureDataUrl) throw Error('Add Vinay’s signature before approving this transaction.');
  return { id, transaction: structuredClone(transaction), transactionHash: transactionFingerprint(transaction), approvedByUid: profile.uid,
    approvedByName: profile.name, approvedAt, reason: reason.trim(), businessName: state.settings.businessName,
    projectName: transaction.projectAllocations?.map(allocation => `${state.projects.find(item => item.id === allocation.projectId)?.name}: INR ${allocation.amount.toFixed(2)}`).join(' / ') || project?.name || 'Company / unassigned', teamName: state.teams.find(team => team.id === transaction.teamId)?.name || '', ...images };
}

export function validateApprovalAttachment(proof, before, after, uid) {
  if (!proof.approval) return;
  if (!after?.proofIds.includes(proof.id)) {
    if (before?.proofIds.includes(proof.id) && uid !== proof.approval.approvedByUid) throw Error('Only Vinay may remove an approved voucher.');
    return;
  }
  if (transactionFingerprint(after) !== proof.approval.transactionHash) throw Error('Remove the approval voucher before changing this transaction, then approve it again.');
}

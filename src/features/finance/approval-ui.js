function canApproveMissing(t){const user=window.TechmigosFinanceAuth.currentUser();return user?.role==='admin'&&user.active!==false&&user.email?.toLowerCase()==='vinay@techmigos.com'&&t&&!t.proofIds?.length}
function showApprovalModal(id){
  const t=state.transactions.find(item=>item.id===id);if(!canApproveMissing(t))throw Error('Only Vinay can approve a transaction marked Missing.');
  const saved=state.settings.approvalImages,signature=project(t.projectId)?.invoiceTemplate?.signatureDataUrl||state.projects.find(p=>p.invoiceTemplate?.signatureDataUrl)?.invoiceTemplate.signatureDataUrl||'';
  ui.approvalDraft={...(saved||{signatureDataUrl:signature,stampDataUrl:''})};
  showModal('Approve missing proof',`<div class="modal-content"><p><strong>${esc(t.description)}</strong> · ${money(t.amount)}</p><p class="note">Create an internal approval voucher signed by Vinay. The original receipt remains unavailable. Approval records your administrator identity and time.</p><form id="approvalForm" data-id="${esc(id)}"><div class="form-field"><label for="approval-reason">Why is the original receipt missing?</label><textarea id="approval-reason" name="reason" required maxlength="1000"></textarea></div><div class="form-grid space-top"><div class="form-field"><label for="approval-signature">Vinay’s signature (PNG or JPEG, up to 2 MiB)</label><input id="approval-signature" type="file" accept="image/png,image/jpeg" data-approval-image="signatureDataUrl"><p id="approval-signatureDataUrl-status" class="note">${ui.approvalDraft.signatureDataUrl?'Saved signature ready':'Add your signature to continue'}</p><img id="approval-signature-preview" alt="Vinay’s approval signature" style="max-width:180px;max-height:70px" ${ui.approvalDraft.signatureDataUrl?`src="${esc(ui.approvalDraft.signatureDataUrl)}"`:'hidden'}></div><div class="form-field"><label for="approval-stamp">Company stamp (optional PNG or JPEG)</label><input id="approval-stamp" type="file" accept="image/png,image/jpeg" data-approval-image="stampDataUrl"><p id="approval-stampDataUrl-status" class="note">${ui.approvalDraft.stampDataUrl?'Saved stamp ready':'Round blue Techmigos stamp will be used'}</p></div></div><p class="note">These images are remembered for Vinay’s future approvals.</p><p class="form-error" role="alert"></p></form></div><div class="modal-footer"><button class="btn" data-act="close-modal">Cancel</button><button class="btn primary" data-act="submit-form" data-form="approvalForm">Approve & add proof</button></div>`);
}
async function readApprovalImage(input){
  const draft=ui.approvalDraft,file=input.files?.[0];if(!draft||!file)return;
  if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024)throw Error('Choose a PNG or JPEG image up to 2 MiB.');
  ui.approvalImageBusy=true;
  try{const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const value=canvas.toDataURL('image/png');if(value.length>200000)throw Error('Choose a smaller signature or stamp.');if(ui.approvalDraft!==draft)return;draft[input.dataset.approvalImage]=value;$('#approval-'+input.dataset.approvalImage+'-status').textContent='Image ready to save';if(input.dataset.approvalImage==='signatureDataUrl'){const preview=$('#approval-signature-preview');preview.src=value;preview.hidden=false}}
  finally{ui.approvalImageBusy=false;input.value=''}
}
async function saveApproval(form){
  const t=state.transactions.find(item=>item.id===form.dataset.id);if(!canApproveMissing(t))throw Error('This transaction no longer has a missing proof.');
  if(ui.approvalImageBusy)throw Error('Wait for the image to finish loading.');
  if(!ui.approvalDraft.signatureDataUrl)throw Error('Add Vinay’s signature before approving.');
  const reason=String(new FormData(form).get('reason')||'').trim();if(!reason)throw Error('Explain why the original receipt is missing.');
  if(JSON.stringify(state.settings.approvalImages)!==JSON.stringify(ui.approvalDraft)){state.settings.approvalImages={...ui.approvalDraft};await saveState()}
  const model=await window.FinanceBackend.prepareApproval(t.id,reason,ui.revision),document=await window.FinanceApprovalDocument.render(model);
  const result=await window.FinanceBackend.finishApproval(model.id,document.blob);
  state=result.state;ui.revision=result.revision;ui.pendingCloud=false;ui.didSave=true;ui.selectedProofId=model.id;
  renderPage();toast('Vinay’s approval voucher has been added as proof.');
}

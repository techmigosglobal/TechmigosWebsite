function transactionProjectName(t){return t.projectAllocations?.length?t.projectAllocations.map(a=>projectName(a.projectId)).join(' / '):projectName(t.projectId)}
function expenseProjectFields(t){const shared=!!t.projectAllocations?.length;return `<div class="span-2"><label class="flex-wrap"><input id="expense-shared" type="checkbox" ${shared?'checked':''}> Share this expense across multiple projects</label><div id="expense-projects" class="space-top" ${shared?'':'hidden'}><p class="note">Select at least two projects. Amounts split equally by default; edit each share as needed.</p>${state.projects.map(p=>{const allocation=t.projectAllocations?.find(a=>a.projectId===p.id);return `<div class="list-row"><label class="flex-wrap"><input type="checkbox" data-expense-project value="${esc(p.id)}" ${allocation?'checked':''}>${esc(p.name)}</label><input class="control small-input" type="number" name="allocation_${esc(p.id)}" aria-label="Amount for ${esc(p.name)}" min="0.01" step="0.01" value="${allocation?.amount??''}" ${allocation?'':'disabled'}></div>`}).join('')}<p class="note" id="expense-split-total" role="status"></p><button class="btn small" type="button" data-act="equal-expense-split">Split equally</button></div></div>`}
function refreshExpenseSplit(equal=false){
  const form=$('#transactionForm');if(!form||!$('#expense-shared'))return;
  const shared=$('#expense-shared').checked;$('#expense-projects').hidden=!shared;$('#f-projectId').closest('.form-field').hidden=shared;
  const selected=[...form.querySelectorAll('[data-expense-project]:checked')].map(input=>input.value);
  const amount=Number(form.elements.namedItem('amount').value||0);
  let allocations=[];if(equal&&selected.length&&amount>=selected.length*.01)allocations=window.FinanceProjectFinance.splitExpense(amount,selected);
  for(const input of form.querySelectorAll('[data-expense-project]')){const field=form.elements.namedItem('allocation_'+input.value);field.disabled=!input.checked;const allocation=allocations.find(a=>a.projectId===input.value);if(allocation)field.value=allocation.amount.toFixed(2);if(!input.checked)field.value=''}
  const total=round(selected.reduce((sum,id)=>sum+Number(form.elements.namedItem('allocation_'+id).value||0),0));
  $('#expense-split-total').textContent=`Allocated ${money(total)} of ${money(amount)} · ${selected.length} projects`;
}
function expenseAllocationsFromForm(form,type,amount){
  if(type!=='expense'||!$('#expense-shared')?.checked)return undefined;
  const allocations=[...form.querySelectorAll('[data-expense-project]:checked')].map(input=>({projectId:input.value,amount:Number(form.elements.namedItem('allocation_'+input.value).value)}));
  if(allocations.length<2||allocations.some(a=>!Number.isFinite(a.amount)||a.amount<=0||Math.abs(a.amount*100-Math.round(a.amount*100))>.001)||Math.round(allocations.reduce((sum,a)=>sum+Math.round(a.amount*100),0))!==Math.round(amount*100))throw Error('Select at least two projects and make their amounts add up exactly to the expense total.');
  return allocations;
}

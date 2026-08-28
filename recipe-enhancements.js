(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m] || m));
  const recipeList = () => $('recipeList') || $('recipes');

  function compressImage(dataUrl, max = 320, quality = 0.72) {
    return new Promise(resolve => {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) return resolve(dataUrl || '');
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.naturalWidth || max, img.naturalHeight || max));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round((img.naturalWidth || max) * scale));
        c.height = Math.max(1, Math.round((img.naturalHeight || max) * scale));
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function openRecipeEditor(index) {
    const r = data.recipes[index];
    if (!r) return;
    const ingredients = Array.isArray(r.ingredients) ? r.ingredients.join('\n') : String(r.ingredients || '');
    const body = `
      <div style="display:grid;gap:10px">
        ${r.thumbnail ? `<img src="${esc(r.thumbnail)}" style="width:100%;max-height:260px;object-fit:cover;border-radius:16px;background:#222">` : ''}
        <label class="small">RECIPE NAME</label>
        <input id="reName" value="${esc(r.name)}">
        <div class="grid">
          <div><label class="small">PREP TIME</label><input id="rePrep" value="${esc(r.prepTime)}"></div>
          <div><label class="small">TOTAL TIME</label><input id="reTotal" value="${esc(r.totalTime)}"></div>
        </div>
        <div class="grid">
          <div><label class="small">DIFFICULTY</label><input id="reDifficulty" value="${esc(r.difficulty)}"></div>
          <div><label class="small">SERVINGS</label><input id="reServings" value="${esc(r.servings)}"></div>
        </div>
        <label class="small">INGREDIENTS</label>
        <textarea id="reIngredients" rows="9">${esc(ingredients)}</textarea>
        <label class="small">INSTRUCTIONS / NOTES</label>
        <textarea id="reInstructions" rows="10">${esc(r.instructions || r.notes || '')}</textarea>
        <label class="small">SOURCE LINK / NOTE</label>
        <input id="reSource" value="${esc(r.source || r.sourceNote || '')}">
      </div>`;
    modal('Recipe Details', body, () => {
      r.name = $('reName').value.trim() || 'Recipe';
      r.prepTime = $('rePrep').value.trim();
      r.totalTime = $('reTotal').value.trim();
      r.difficulty = $('reDifficulty').value.trim();
      r.servings = $('reServings').value.trim();
      r.ingredients = $('reIngredients').value.split('\n').map(x => x.trim()).filter(Boolean);
      r.instructions = $('reInstructions').value;
      r.source = $('reSource').value.trim();
      r.notes = r.instructions;
      r.updatedAt = new Date().toISOString();
      closeModal();
      save();
    });
    const actions = $('actions');
    if (actions) {
      const del = document.createElement('button');
      del.className = 'crud delete';
      del.textContent = 'Delete';
      del.onclick = () => {
        if (confirm('Delete this recipe?')) {
          data.recipes.splice(index, 1);
          closeModal();
          save();
        }
      };
      actions.insertBefore(del, actions.firstChild);
    }
  }

  function renderRecipeCards() {
    const box = recipeList();
    if (!box) return;
    if (!Array.isArray(data.recipes) || !data.recipes.length) {
      box.innerHTML = '<div class="empty">No recipes yet. Tap Add recipe and choose a recipe screenshot.</div>';
      return;
    }
    box.innerHTML = data.recipes.map((r, i) => {
      const time = r.totalTime || r.prepTime || '';
      const diff = r.difficulty || '';
      const image = r.thumbnail || r.image || '';
      return `<div class="recipe-card" data-recipe-index="${i}" style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line);cursor:pointer">
        ${image ? `<img src="${esc(image)}" style="width:88px;height:88px;object-fit:cover;border-radius:14px;background:#222;flex:none">` : `<div style="width:88px;height:88px;border-radius:14px;background:#1b1b1f;display:grid;place-items:center;font-size:28px;flex:none">🍴</div>`}
        <div class="grow" style="min-width:0"><b style="font-size:16px;display:block">${esc(r.name || 'Recipe')}</b>
          <div class="small" style="margin-top:5px">${esc(time)}${time && diff ? ' · ' : ''}${esc(diff)}</div>
          <div class="small" style="margin-top:4px">${Array.isArray(r.ingredients) ? r.ingredients.length : 0} ingredients · Tap to edit</div>
        </div><span style="font-size:22px">›</span>
      </div>`;
    }).join('');
    box.querySelectorAll('[data-recipe-index]').forEach(el => el.onclick = () => openRecipeEditor(Number(el.dataset.recipeIndex)));
  }

  function captureRecipe() {
    const body = `
      <div class="small" style="margin-bottom:8px">Add a screenshot. AI will read the recipe, turn it into editable fields, and create a clean recipe photo for the card.</div>
      <textarea id="recipeUserNote" rows="3" placeholder="Optional note, e.g. 'make this spicy' or 'use this exact serving size'"></textarea>
      <input id="recipeFile" type="file" accept="image/*">
      <div id="recipeCapturePreview" style="display:none;margin-top:8px"></div>
      <div id="recipeAIStatus" class="ai-preview" style="display:none"></div>`;
    modal('Add Recipe', body, async () => {
      const file = $('recipeFile')?.files?.[0];
      if (!file) return alert('Choose a recipe screenshot first.');
      const saveBtn = $('save');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Reading recipe…'; }
      const status = $('recipeAIStatus');
      if (status) { status.style.display = 'block'; status.innerHTML = '<b>AI is reading the screenshot…</b><div class="small">Then it will make a clean recipe thumbnail.</div>'; }
      try {
        const image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const preview = $('recipeCapturePreview');
        if (preview) { preview.style.display = 'block'; preview.innerHTML = `<img src="${esc(image)}" style="width:100%;max-height:260px;object-fit:contain;border-radius:14px">`; }
        const response = await fetch('/api/recipe-ai', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({image, text: $('recipeUserNote')?.value || ''})
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Recipe AI failed.');
        if (!result.name || result.name === 'Unrecognized recipe') {
          throw new Error(result.sourceNote || 'I could not identify a recipe in that image.');
        }
        const thumbnail = await compressImage(result.thumbnail || '', 320, 0.72);
        const recipe = {
          id: 'recipe_' + Date.now(),
          name: result.name,
          ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
          instructions: result.instructions || '',
          notes: result.instructions || result.sourceNote || '',
          source: result.sourceNote || '',
          sourceNote: result.sourceNote || '',
          prepTime: result.prepTime || '',
          totalTime: result.totalTime || '',
          difficulty: result.difficulty || '',
          servings: result.servings || '',
          thumbnail,
          image,
          createdAt: new Date().toISOString()
        };
        data.recipes.unshift(recipe);
        closeModal();
        save();
        show('recipes');
        setTimeout(() => openRecipeEditor(0), 80);
      } catch (e) {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
        if (status) { status.style.display = 'block'; status.innerHTML = `<b>Could not read this recipe.</b><div class="small">${esc(e.message || 'Try another screenshot.')}</div><div class="small" style="margin-top:6px">You can still add it manually.</div>`; }
      }
    });
  }

  function wire() {
    const add = $('addRecipe');
    if (add) add.onclick = captureRecipe;
    if (typeof window.render === 'function' && !window.__recipeRenderWrapped) {
      const originalRender = window.render;
      window.render = function() {
        originalRender();
        renderRecipeCards();
      };
      window.__recipeRenderWrapped = true;
    }
    renderRecipeCards();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();

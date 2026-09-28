(() => {
  'use strict';

  const compositionLabels = new Map([
    ['spotlight', 'Spotlight'],
    ['editorial', 'Editorial'],
    ['gallery', 'Gallery'],
  ]);
  const paletteLabels = new Map([
    ['orchard', 'Orchard'],
    ['terracotta', 'Terracotta'],
    ['afterhours', 'After hours'],
  ]);

  const direction = { composition: 'spotlight', palette: 'orchard' };

  function getDirectionLabel() {
    return `${compositionLabels.get(direction.composition)} / ${paletteLabels.get(direction.palette)}`;
  }

  function focusSection(section) {
    if (!section.hasAttribute('tabindex')) {
      section.setAttribute('tabindex', '-1');
      section.addEventListener(
        'blur',
        () => section.removeAttribute('tabindex'),
        {
          once: true,
        },
      );
    }
    section.focus({ preventScroll: true });
  }

  function isPlainClick(event) {
    return (
      event.button === 0 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey
    );
  }

  function initNavigation() {
    const toggle = document.querySelector('[data-menu-toggle]');
    const navigation = document.getElementById('primary-navigation');
    if (!toggle || !navigation) return;

    const menuLabel = toggle.querySelector('[data-menu-label]');
    const mobileViewport = window.matchMedia('(max-width: 55.999rem)');
    const links = [...navigation.querySelectorAll('a[href^="#"]')];

    function setMenuOpen(open) {
      toggle.setAttribute('aria-expanded', String(open));
      if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';
    }

    function isMenuOpen() {
      return (
        mobileViewport.matches &&
        toggle.getAttribute('aria-expanded') === 'true'
      );
    }

    toggle.addEventListener('click', () => setMenuOpen(!isMenuOpen()));

    navigation.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || !isPlainClick(event)) return;

      const destination = document.getElementById(link.hash.slice(1));
      if (isMenuOpen()) {
        setMenuOpen(false);
        if (destination) focusSection(destination);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !isMenuOpen()) return;
      event.preventDefault();
      setMenuOpen(false);
      toggle.focus({ preventScroll: true });
    });

    document.addEventListener('click', (event) => {
      if (
        !isMenuOpen() ||
        navigation.contains(event.target) ||
        toggle.contains(event.target)
      )
        return;
      const focusWasInside = navigation.contains(document.activeElement);
      setMenuOpen(false);
      if (focusWasInside) toggle.focus({ preventScroll: true });
    });

    document.addEventListener('focusin', (event) => {
      if (
        isMenuOpen() &&
        !navigation.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    });

    mobileViewport.addEventListener('change', () => {
      setMenuOpen(
        mobileViewport.matches && navigation.contains(document.activeElement),
      );
      if (!mobileViewport.matches && document.activeElement === toggle) {
        links[0]?.focus({ preventScroll: true });
      }
    });

    setMenuOpen(
      mobileViewport.matches && navigation.contains(document.activeElement),
    );
    toggle.hidden = false;

    const sections = [...document.querySelectorAll('main > section[id]')];
    let currentSection;
    let framePending = false;

    function updateCurrentSection() {
      framePending = false;
      const readingLine = Math.min(window.innerHeight * 0.25, 200);
      let sectionId = sections[0]?.id;

      for (const section of sections) {
        if (section.getBoundingClientRect().top > readingLine) break;
        sectionId = section.id;
      }

      if (sectionId === currentSection) return;
      currentSection = sectionId;
      for (const link of links) {
        if (link.hash === `#${sectionId}`) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    }

    function scheduleSectionUpdate() {
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(updateCurrentSection);
    }

    window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
    window.addEventListener('resize', scheduleSectionUpdate);
    window.addEventListener('pageshow', scheduleSectionUpdate);
    document.addEventListener('toggle', scheduleSectionUpdate, true);
    updateCurrentSection();
  }

  function initGallery() {
    const filters = document.querySelector('[data-gallery-filters]');
    const grid = document.querySelector('[data-concept-grid]');
    const status = document.querySelector('[data-gallery-status]');
    if (!filters || !grid) return;

    const buttons = [...filters.querySelectorAll('button[data-filter]')];
    const cards = [...grid.querySelectorAll('[data-category]')];

    for (const button of buttons) {
      button.addEventListener('click', () => {
        const category = button.dataset.filter;
        let visibleCount = 0;

        for (const card of cards) {
          card.hidden =
            category !== 'all' && card.dataset.category !== category;
          if (!card.hidden) visibleCount += 1;
        }
        for (const filter of buttons) {
          filter.setAttribute('aria-pressed', String(filter === button));
        }
        if (status) {
          status.textContent = `${visibleCount} ${visibleCount === 1 ? 'concept' : 'concepts'} shown. Filter: ${button.textContent.trim()}.`;
        }
      });
    }

    filters.hidden = false;
  }

  function initPlayground(onDirectionChange) {
    const controls = document.querySelector('[data-playground-controls]');
    const canvas = document.querySelector('[data-demo-grid]');
    const caption = document.querySelector('[data-canvas-caption]');
    const status = document.querySelector('[data-playground-status]');
    if (!controls || !canvas) return;

    const radios = [...controls.querySelectorAll('input[type="radio"]')];

    function readSelection(name, labels, fallback) {
      const selection = radios.find(
        (radio) => radio.name === name && radio.checked,
      );
      return labels.has(selection?.value) ? selection.value : fallback;
    }

    function render(announce = false) {
      direction.composition = readSelection(
        'composition',
        compositionLabels,
        'spotlight',
      );
      direction.palette = readSelection('palette', paletteLabels, 'orchard');
      canvas.dataset.composition = direction.composition;
      canvas.dataset.palette = direction.palette;

      const description = `${compositionLabels.get(direction.composition)} composition · ${paletteLabels.get(direction.palette)} palette`;
      if (caption) caption.textContent = description;
      if (announce && status)
        status.textContent = `Canvas updated: ${description}.`;
      onDirectionChange();
    }

    controls.addEventListener('change', (event) => {
      if (radios.includes(event.target)) render(true);
    });

    controls
      .querySelector('[data-reset-playground]')
      ?.addEventListener('click', () => {
        for (const radio of radios) radio.checked = radio.defaultChecked;
        render(true);
      });

    render();
    controls.hidden = false;
    window.addEventListener('pageshow', () => render());
  }

  function initProjectBrief() {
    const form = document.querySelector('[data-project-form]');
    const result = document.querySelector('[data-brief-result]');
    const summary = document.querySelector('[data-brief-summary]');
    const directionLabel = document.querySelector('[data-brief-direction]');
    const status = document.querySelector('[data-brief-status]');
    const downloadButton = document.querySelector('[data-download-brief]');
    const editButton = document.querySelector('[data-edit-brief]');
    const heading = document.getElementById('brief-result-title');

    function syncDirectionLabel() {
      if (directionLabel) directionLabel.textContent = getDirectionLabel();
    }

    if (
      !form ||
      !result ||
      !summary ||
      !downloadButton ||
      !editButton ||
      !heading ||
      !status
    ) {
      return syncDirectionLabel;
    }

    const brand = form.elements.namedItem('brandName');
    const projectType = form.elements.namedItem('projectType');
    const goal = form.elements.namedItem('projectGoal');
    if (!brand || !projectType || !goal) return syncDirectionLabel;

    const fields = [brand, projectType, goal];
    const allowedTypes = new Set(
      [...projectType.options].map((option) => option.value).filter(Boolean),
    );
    const errors = new Map();
    let brief = null;
    let downloadUrl = null;
    let downloadTimer = null;

    function validateField(field) {
      field.setCustomValidity('');
      if (field === brand && !field.value.trim()) {
        field.setCustomValidity('Please enter a brand name or working title.');
      } else if (field === projectType && !allowedTypes.has(field.value)) {
        field.setCustomValidity('Please choose a website type.');
      } else if (field.maxLength > 0 && field.value.length > field.maxLength) {
        field.setCustomValidity(
          `Please use ${field.maxLength} characters or fewer.`,
        );
      }
    }

    function showFieldError(field) {
      const error = errors.get(field);
      const invalid = !field.validity.valid;
      field.setAttribute('aria-invalid', String(invalid));
      error.textContent = invalid ? field.validationMessage : '';
      error.hidden = !invalid;
    }

    for (const field of fields) {
      const hint = field.parentElement.querySelector('.field-hint');
      const descriptions = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter(Boolean);
      if (hint) {
        if (!hint.id) hint.id = `${field.id}-hint`;
        descriptions.push(hint.id);
      }

      const error = document.createElement('p');
      error.className = 'field-hint';
      error.id = `${field.id}-error`;
      error.hidden = true;
      field.parentElement.append(error);
      descriptions.push(error.id);
      field.setAttribute(
        'aria-describedby',
        [...new Set(descriptions)].join(' '),
      );
      errors.set(field, error);

      field.addEventListener('invalid', () => showFieldError(field));
      function handleEdit() {
        validateField(field);
        if (field.hasAttribute('aria-invalid')) showFieldError(field);
        status.textContent = '';
      }
      field.addEventListener('input', handleEdit);
      field.addEventListener('change', handleEdit);
    }

    function getBriefEntries() {
      return [
        ['Brand or project', brief.brandName],
        ['Website type', brief.projectType],
        ['Visitor goal', brief.projectGoal || 'To be discussed'],
        ['Composition', compositionLabels.get(direction.composition)],
        ['Color palette', paletteLabels.get(direction.palette)],
      ];
    }

    function renderSummary() {
      const fragment = document.createDocumentFragment();
      for (const [label, value] of getBriefEntries()) {
        const row = document.createElement('div');
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        row.append(term, description);
        fragment.append(row);
      }
      summary.replaceChildren(fragment);
    }

    function syncDirection() {
      syncDirectionLabel();
      if (brief) renderSummary();
    }

    function showForm() {
      form.hidden = false;
      result.hidden = true;
      status.textContent = '';
      syncDirectionLabel();
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      for (const field of fields) {
        validateField(field);
        showFieldError(field);
      }
      if (!form.reportValidity()) {
        status.textContent =
          'Please check the highlighted fields. Your answers are still here.';
        return;
      }

      brief = {
        brandName: brand.value.trim(),
        projectType: projectType.value,
        projectGoal: goal.value.trim(),
      };
      renderSummary();
      result.hidden = false;
      form.hidden = true;
      status.textContent =
        'Your brief is ready to download. Nothing has been sent.';
      heading.focus();
    });

    editButton.addEventListener('click', () => {
      showForm();
      brand.focus();
    });

    const conceptTypes = new Map([
      ['creative', 'Creative portfolio'],
      ['product', 'Product or brand launch'],
      ['local', 'Local business'],
    ]);

    for (const link of document.querySelectorAll(
      '[data-category] a[href="#your-project"]',
    )) {
      link.addEventListener('click', (event) => {
        if (!isPlainClick(event)) return;
        const type = conceptTypes.get(
          link.closest('[data-category]').dataset.category,
        );
        if (!type || !allowedTypes.has(type)) return;
        showForm();
        projectType.value = type;
        validateField(projectType);
        showFieldError(projectType);
        brand.focus({ preventScroll: true });
      });
    }

    function releaseDownload() {
      window.clearTimeout(downloadTimer);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = null;
      downloadTimer = null;
    }

    downloadButton.addEventListener('click', () => {
      if (!brief) return;
      const link = document.createElement('a');
      try {
        releaseDownload();
        const content = [
          'FORM & FIELD — PROJECT BRIEF',
          '',
          ...getBriefEntries().map(([label, value]) => `${label}: ${value}`),
          '',
          'Created with the Form & Field bento showcase.',
          'A starting point for a project conversation, not a submitted inquiry.',
          '',
        ].join('\r\n');
        const filename =
          brief.brandName
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 60)
            .replace(/^-+|-+$/g, '') || 'your-project';

        downloadUrl = URL.createObjectURL(
          new Blob(['\uFEFF', content], {
            type: 'text/plain;charset=utf-8',
          }),
        );
        link.href = downloadUrl;
        link.download = `form-and-field-${filename}-brief.txt`;
        link.hidden = true;
        document.body.append(link);
        link.click();
        status.textContent =
          'Download requested. If no file appears, you can copy the brief above.';
        downloadTimer = window.setTimeout(releaseDownload, 30000);
      } catch {
        releaseDownload();
        status.textContent =
          'The download could not start. Your brief is still above; you can select and copy it.';
      } finally {
        link.remove();
      }
    });

    window.addEventListener('pagehide', releaseDownload);
    form.noValidate = true;
    syncDirection();
    form.hidden = false;
    return syncDirection;
  }

  initNavigation();
  initGallery();
  const syncBriefDirection = initProjectBrief();
  initPlayground(syncBriefDirection);

  for (const year of document.querySelectorAll('[data-current-year]')) {
    year.textContent = String(new Date().getFullYear());
  }
})();

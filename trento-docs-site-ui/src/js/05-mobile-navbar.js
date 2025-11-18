;(function () {
  'use strict'

  var navbarBurger = document.querySelector('.navbar-burger')
  if (!navbarBurger) return
  navbarBurger.addEventListener('click', toggleNavbarMenu.bind(navbarBurger))

  var searchField = document.getElementById('search-wrapper')
  var searchClose = document.getElementById('search-close')
  var searchToggle = document.querySelector('.search-toggle')
  if (!searchField) return
  searchClose.addEventListener('click', toggleSearch)
  searchToggle.addEventListener('click', toggleSearch)

  function toggleNavbarMenu (e) {
    e.stopPropagation() // trap event
    !searchField.classList.contains('hidden') && toggleSearch(e)
    document.documentElement.classList.toggle('is-clipped--navbar')
    navbarBurger.setAttribute('aria-expanded', navbarBurger.classList.toggle('is-active'))
    var menu = document.getElementById(navbarBurger.getAttribute('aria-controls') || navbarBurger.dataset.target)
    if (menu.classList.toggle('is-active')) {
      menu.style.maxHeight = ''
      var expectedMaxHeight = window.innerHeight - Math.round(menu.getBoundingClientRect().top)
      var actualMaxHeight = parseInt(window.getComputedStyle(menu).maxHeight, 10)
      if (actualMaxHeight !== expectedMaxHeight) menu.style.maxHeight = expectedMaxHeight + 'px'
    }
  }

  function toggleSearch (e) {
    e.stopPropagation()
    navbarBurger.classList.contains('is-active') && toggleNavbarMenu(e)
    searchField.classList.toggle('hidden')
  }
})()

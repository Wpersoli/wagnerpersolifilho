(function () {
  'use strict';
  var button = document.getElementById('cvPrint');
  if (button) button.addEventListener('click', function () { window.print(); });
}());

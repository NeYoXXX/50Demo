let list = document.querySelectorAll('.panel')

list.forEach(item => {
    item.addEventListener('click', () => {
        removeActiveClasses()
        item.classList.add('active')
    })

})

function removeActiveClasses() {
    list.forEach(item => {
        item.classList.remove('active')
    })
}
// Check if TransitionSettings is rendering
// Run this in browser console on the Settings page

console.log('🔍 Checking TransitionSettings component...\n');

// Check if the card exists in DOM
const transitionCard = Array.from(document.querySelectorAll('[class*="Card"]'))
  .find(card => card.textContent?.includes('Transition Planner'));

if (transitionCard) {
  console.log('✅ TransitionSettings card found in DOM!');
  console.log('📍 Scrolling to it now...');
  transitionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  transitionCard.style.border = '3px solid red';
  console.log('🔴 Added red border to highlight it');
} else {
  console.error('❌ TransitionSettings card NOT found in DOM');
  console.log('\n💡 Checking for React errors...');

  // Check if there are any React errors
  const hasReactError = document.body.textContent?.includes('React') &&
                       document.body.textContent?.includes('Error');

  if (hasReactError) {
    console.error('⚠️  Possible React error on page');
  }

  console.log('\n💡 All rendered card titles:');
  document.querySelectorAll('[class*="CardTitle"]').forEach((title, i) => {
    console.log(`   ${i + 1}. ${title.textContent?.trim()}`);
  });
}

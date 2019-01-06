/**
 * Default intent when user starts interaction with Genie
 */
export default function mainIntent() {
    this.ask('Welcome to Clariba Genie! What do you want to know?',
        'Please perform a query to Clariba Genie!');
}
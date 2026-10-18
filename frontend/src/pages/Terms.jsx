import React from 'react';
import LegalPage from '../components/LegalPage';

const Terms = () => (
  <LegalPage
    title="Terms and Conditions"
    intro="Welcome to our AI Feature Kit platform. By accessing or using our services, you agree to be bound by the following terms and conditions:"
    backTo={{ to: '/signup', label: 'Back to Signup' }}
    sections={[
      {
        heading: '1. Account Creation',
        items: [
          'All information provided during signup must be accurate.',
          'Accounts created with false information may be terminated.',
        ],
      },
      {
        heading: '2. Data Usage',
        items: [
          'Your data is used only to improve the AI feature experience.',
          'We do not sell or share your personal data with third parties.',
        ],
      },
      {
        heading: '3. User Responsibilities',
        items: [
          'You agree not to misuse or attempt to harm the platform.',
          'Users must not upload or share inappropriate or illegal content.',
        ],
      },
      {
        heading: '4. Intellectual Property',
        body: 'All content, including UI, features, and code, is the property of the AI Feature Kit team. Unauthorized copying or use is prohibited.',
      },
      {
        heading: '5. Termination',
        body: 'We reserve the right to suspend or terminate any user account found in violation of these terms without prior notice.',
      },
      {
        heading: '6. Changes to Terms',
        body: 'These terms may be updated periodically. We encourage users to review this page regularly.',
      },
      {
        heading: '7. Contact Us',
        body: 'If you have any questions or concerns about these Terms and Conditions, feel free to contact us through the form on our Contact page.',
      },
    ]}
  />
);

export default Terms;

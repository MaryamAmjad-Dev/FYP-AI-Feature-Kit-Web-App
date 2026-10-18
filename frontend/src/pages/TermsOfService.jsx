import React from 'react';
import LegalPage from '../components/LegalPage';

const TermsOfService = () => (
  <LegalPage
    title="Terms of Service"
    intro="Welcome to AI Feature Kit! By using our services, you agree to the following terms and conditions. Please read them carefully."
    sections={[
      {
        heading: '1. Acceptance of Terms',
        body: 'By accessing or using our platform, you accept and agree to be bound by these Terms of Service.',
      },
      {
        heading: '2. Use of Service',
        body: 'You may not use the service for any illegal or unauthorized purpose. You agree to comply with all laws and regulations.',
      },
      {
        heading: '3. Account Responsibilities',
        body: 'You are responsible for safeguarding your login credentials and for any activity on your account.',
      },
      {
        heading: '4. Intellectual Property',
        body: 'All content and code on the site is the property of AI Feature Kit. You may not reproduce, duplicate, or exploit any part without permission.',
      },
      {
        heading: '5. Service Modifications',
        body: 'We reserve the right to modify or discontinue the service at any time without notice.',
      },
      {
        heading: '6. Termination',
        body: 'We may suspend or terminate your access to the service if you violate these terms.',
      },
      {
        heading: '7. Contact Us',
        body: 'If you have any questions about these Terms of Service, please contact us via the Contact page.',
      },
    ]}
  />
);

export default TermsOfService;

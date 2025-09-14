import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { ApiService } from '../services/apiService';

// Mock the ApiService
jest.mock('../services/apiService');
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Journey', () => {
    test('should complete full plan submission flow successfully', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      mockApiService.submitPlan.mockResolvedValue({
        success: true,
        message: 'Plan submission received successfully',
        data: {
          submissionId: 'sub_1234567890_abc123',
          emailSent: true,
          submittedAt: '2025-02-13T10:00:00Z'
        }
      });

      render(<App />);

      // Step 1: Initial prompt - click "Yes"
      const yesButton = screen.getByText('Yes! 💕');
      await user.click(yesButton);

      // Step 2: Planning phase - fill out the form
      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });

      // Fill in name
      const nameInput = screen.getByLabelText(/your name/i);
      await user.type(nameInput, 'Sarah Johnson');

      // Select date (assuming date picker is available)
      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2025-03-15');

      // Select time
      const timeInput = screen.getByLabelText(/time/i);
      await user.type(timeInput, '18:30');

      // Select activities
      const dinnerCheckbox = screen.getByLabelText(/dinner at restaurant/i);
      await user.click(dinnerCheckbox);

      const movieCheckbox = screen.getByLabelText(/movie theater/i);
      await user.click(movieCheckbox);

      // Add custom activity
      const customActivityInput = screen.getByLabelText(/custom activity/i);
      await user.type(customActivityInput, 'Visit the local art gallery');

      // Submit the plan
      const submitButton = screen.getByText(/create plan/i);
      await user.click(submitButton);

      // Step 3: Summary phase - review and confirm
      await waitFor(() => {
        expect(screen.getByText(/here's our plan/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText(/dinner at restaurant/i)).toBeInTheDocument();
      expect(screen.getByText(/movie theater/i)).toBeInTheDocument();
      expect(screen.getByText(/visit the local art gallery/i)).toBeInTheDocument();

      const confirmButton = screen.getByText(/looks perfect/i);
      await user.click(confirmButton);

      // Step 4: Confirmation phase - verify submission
      await waitFor(() => {
        expect(screen.getByText(/it's a date!/i)).toBeInTheDocument();
      });

      // Verify API was called with correct data
      expect(mockApiService.submitPlan).toHaveBeenCalledWith({
        name: 'Sarah Johnson',
        date: expect.any(Date),
        time: '18:30',
        activities: ['Dinner at restaurant', 'Movie theater'],
        customActivity: 'Visit the local art gallery'
      });

      // Verify success message is displayed
      await waitFor(() => {
        expect(screen.getByText(/plan submitted successfully/i)).toBeInTheDocument();
        expect(screen.getByText(/email notification sent/i)).toBeInTheDocument();
      });
    });

    test('should handle API failure gracefully', async () => {
      const user = userEvent.setup();

      // Mock API failure
      mockApiService.submitPlan.mockResolvedValue({
        success: false,
        message: 'Network error occurred',
        error: 'timeout'
      });

      render(<App />);

      // Navigate through the flow quickly
      const yesButton = screen.getByText('Yes! 💕');
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });

      // Fill minimal required data
      await user.type(screen.getByLabelText(/your name/i), 'Test User');
      await user.type(screen.getByLabelText(/date/i), '2025-03-20');
      await user.type(screen.getByLabelText(/time/i), '19:00');
      await user.click(screen.getByLabelText(/dinner at restaurant/i));

      await user.click(screen.getByText(/create plan/i));

      await waitFor(() => {
        expect(screen.getByText(/looks perfect/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/looks perfect/i));

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/failed to submit plan/i)).toBeInTheDocument();
        expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
        expect(screen.getByText(/plan details are still saved locally/i)).toBeInTheDocument();
      });
    });

    test('should handle "Maybe" response flow', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Click "Maybe" instead of "Yes"
      const maybeButton = screen.getByText('Maybe... 🤔');
      await user.click(maybeButton);

      // Should show "Maybe" screen
      await waitFor(() => {
        expect(screen.getByText(/"maybe" is just "yes" in disguise!/i)).toBeInTheDocument();
      });

      // Click "Okay, let's do it!" to proceed to planning
      const proceedButton = screen.getByText(/okay, let's do it!/i);
      await user.click(proceedButton);

      // Should now be in planning phase
      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });
    });

    test('should validate form inputs correctly', async () => {
      const user = userEvent.setup();

      render(<App />);

      const yesButton = screen.getByText('Yes! 💕');
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const submitButton = screen.getByText(/create plan/i);
      await user.click(submitButton);

      // Should show validation errors or prevent submission
      // (Exact behavior depends on form validation implementation)
      expect(mockApiService.submitPlan).not.toHaveBeenCalled();
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile viewport', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const user = userEvent.setup();

      render(<App />);

      // Verify initial screen renders correctly on mobile
      expect(screen.getByText(/will you go out with me/i)).toBeInTheDocument();

      // Test navigation works on mobile
      const yesButton = screen.getByText('Yes! 💕');
      expect(yesButton).toBeInTheDocument();
      
      await user.click(yesButton);

      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should be accessible with keyboard navigation', async () => {
      render(<App />);

      // Test keyboard navigation
      const yesButton = screen.getByText('Yes! 💕');
      
      // Focus should be manageable via keyboard
      yesButton.focus();
      expect(yesButton).toHaveFocus();

      // Enter key should work
      fireEvent.keyDown(yesButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });
    });

    test('should have proper ARIA labels and roles', () => {
      render(<App />);

      // Check for proper semantic HTML and ARIA attributes
      const mainElement = screen.getByRole('main');
      expect(mainElement).toBeInTheDocument();

      // Buttons should have proper roles
      const yesButton = screen.getByText('Yes! 💕');
      expect(yesButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Performance', () => {
    test('should handle rapid user interactions', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Rapid clicking should not cause issues
      const yesButton = screen.getByText('Yes! 💕');
      
      await user.click(yesButton);
      await user.click(yesButton); // Double click
      
      // Should only navigate once
      await waitFor(() => {
        expect(screen.getByText('Plan Our Date! 💕')).toBeInTheDocument();
      });
    });

    test('should handle slow network conditions', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      mockApiService.submitPlan.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            success: true,
            message: 'Plan submission received successfully',
            data: {
              submissionId: 'sub_slow_response',
              emailSent: true,
              submittedAt: new Date().toISOString()
            }
          }), 2000)
        )
      );

      render(<App />);

      // Complete the flow
      await user.click(screen.getByText('Yes! 💕'));

      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/your name/i), 'Slow Network User');
      await user.type(screen.getByLabelText(/date/i), '2025-03-25');
      await user.type(screen.getByLabelText(/time/i), '20:00');
      await user.click(screen.getByLabelText(/dinner at restaurant/i));

      await user.click(screen.getByText(/create plan/i));

      await waitFor(() => {
        expect(screen.getByText(/looks perfect/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/looks perfect/i));

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/submitting your plan/i)).toBeInTheDocument();
      });

      // Eventually should show success (with longer timeout for slow response)
      await waitFor(() => {
        expect(screen.getByText(/plan submitted successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
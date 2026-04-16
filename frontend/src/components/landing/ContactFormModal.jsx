import React, { useState } from 'react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { X, Mail, Phone, User, MessageSquare } from 'lucide-react';

function ContactFormModal({ isOpen, onClose, contactType }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    shopName: '',
    message: '',
  });

  const getTypeTitle = () => {
    switch (contactType) {
      case 'demo':
        return 'Book Free Demo';
      case 'trial':
        return 'Start Free Trial';
      case 'call':
        return 'Request a Call';
      default:
        return 'Get in Touch';
    }
  };

  const getTypeSubtitle = () => {
    switch (contactType) {
      case 'demo':
        return 'See how WarrantyDesk eliminates manual registers';
      case 'trial':
        return '14 days free trial - no credit card required';
      case 'call':
        return 'We will call you within 24 hours';
      default:
        return 'Fill the form and we will get back to you';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    //send message to whatsapp
    window.open(`https://wa.me/918085035032?text=${encodeURIComponent(
      `Name: ${formData.name}\nPhone: ${formData.phone}\nShop Name: ${formData.shopName}\nMessage: ${formData.message}`,
    )}`);
    onClose();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg">
      <DialogHeader
        title={getTypeTitle()}
        subtitle={getTypeSubtitle()}
        onClose={onClose}
        icon={contactType === 'demo' ? <Mail size={20} /> : contactType === 'trial' ? <Phone size={20} /> : <MessageSquare size={20} />}
      />
      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User size={16} className="inline mr-2" />
              Your Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-input dark:border-dark-border dark:text-white"
              placeholder="Rajesh Kumar"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone size={16} className="inline mr-2" />
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-input dark:border-dark-border dark:text-white"
              placeholder="98765 43210"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shop Name
            </label>
            <input
              type="text"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-input dark:border-dark-border dark:text-white"
              placeholder="Kumar Electronics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare size={16} className="inline mr-2" />
              Message
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-dark-input dark:border-dark-border dark:text-white"
              placeholder="Tell us about your requirements..."
            />
          </div>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
          Submit
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export default ContactFormModal;

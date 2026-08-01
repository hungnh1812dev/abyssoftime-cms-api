import avatar from "@/assets/images/avatar.png";

export const contactData: {
  name: string;
  address: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  avatar: {
    url: string;
  };
} = {
  name: "Hung Nguyen Huy",
  address: "Ho Chi Minh, Vietnam",
  email: "hungnh1812dev@gmail.com",
  phone: "0372356789",
  avatar: { url: avatar.src },
  linkedin: "https://www.linkedin.com/in/hùng-nguyễn-huy-9509531a4/",
  github: "https://github.com/hungnh1812dev",
};
